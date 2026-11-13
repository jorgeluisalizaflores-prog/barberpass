// Preparación automática para desplegar "de un clic" (lo ejecuta Vercel en cada
// compilación; ver vercel.json). Es idempotente: se puede correr mil veces.
//   1. Aplica las migraciones.
//   2. Permite que la conexión adopte el rol restringido `barberpass_app`.
//   3. Carga los planes y la configuración inicial.
//   4. Crea el super administrador (ADMIN_EMAIL / ADMIN_PASSWORD) si no hay ninguno.
//   5. Crea la barbería demo si no existe.
//   6. Compila la aplicación.
import "dotenv/config";
import { execSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

// La integración Vercel + Neon define DATABASE_URL (con pool) y
// DATABASE_URL_UNPOOLED (directa). Las migraciones usan la directa.
process.env.DATABASE_URL ||= process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || "";
process.env.DIRECT_URL ||= process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL;

const correr = (comando: string) => execSync(comando, { stdio: "inherit", env: process.env });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Falta DATABASE_URL. En Vercel: pestaña Storage → Create Database → Neon, y vuelve a desplegar.");
  }

  console.log("▶ 1/6 Migraciones");
  correr("npx prisma migrate deploy");

  console.log("▶ 2/6 Rol restringido de la aplicación");
  const rol = process.env.DB_APP_ROLE || "barberpass_app";
  const dueno = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });
  try {
    const [{ usuario }] = await dueno.$queryRaw<{ usuario: string }[]>`SELECT current_user::text AS usuario`;
    const [{ puede }] = await dueno.$queryRaw<{ puede: boolean }[]>`SELECT pg_has_role(current_user, ${rol}, 'SET') AS puede`;
    if (usuario !== rol && !puede) await dueno.$executeRawUnsafe(`GRANT "${rol}" TO "${usuario}" WITH SET TRUE, INHERIT FALSE`);
  } catch (e) {
    console.warn(`  (no se pudo conceder el rol automáticamente: ${(e as Error).message.split("\n").pop()})`);
  } finally {
    await dueno.$disconnect();
  }

  console.log("▶ 3/6 Planes y configuración inicial");
  correr("npx tsx prisma/seed.ts");

  // Se importan aquí para que usen las variables ya resueltas arriba.
  const { conPlataforma } = await import("../src/lib/db");
  const { guardarSuperAdmin } = await import("../src/lib/servicios/autenticacion");
  const { obtenerDemo, reiniciarDemo } = await import("../src/lib/servicios/demo");
  const { ACTOR_SISTEMA } = await import("../src/lib/auditoria");
  const { tokenSeguro } = await import("../src/lib/tokens");

  console.log("▶ 4/6 Super administrador");
  const admins = await conPlataforma((db) => db.superAdmin.count());
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (admins > 0) console.log("  Ya existe: no se modifica.");
  else if (ADMIN_EMAIL && ADMIN_PASSWORD && ADMIN_PASSWORD.length >= 8) {
    await guardarSuperAdmin(ADMIN_EMAIL.trim().toLowerCase(), process.env.ADMIN_NAME || "Administrador", ADMIN_PASSWORD);
    console.log(`  Creado: ${ADMIN_EMAIL}. Ingresa en /admin`);
  } else console.warn("  ⚠ Sin super administrador: define ADMIN_EMAIL y ADMIN_PASSWORD (mínimo 8 caracteres) y vuelve a desplegar.");

  console.log("▶ 5/6 Barbería demo");
  if (await obtenerDemo()) console.log("  Ya existe: no se modifica.");
  else {
    await reiniciarDemo(ACTOR_SISTEMA, process.env.DEMO_PASSWORD || tokenSeguro(9));
    console.log("  Creada. Página pública: /demo");
  }

  console.log("▶ 6/6 Compilación");
  correr("npm run build");
}

main().then(() => process.exit(0)).catch((e) => { console.error(`✖ ${e.message ?? e}`); process.exit(1); });
