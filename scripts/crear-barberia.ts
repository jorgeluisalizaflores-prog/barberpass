// Da de alta una barbería manualmente desde la consola.
// Uso:
//   npm run crear-barberia -- --nombre "Barbería El Bigote" --slug el-bigote \
//     --dueno "Juan Pérez" --email juan@correo.com --password "clave-segura" [--plan "Pro"]
import "dotenv/config";
import { ACTOR_SISTEMA } from "../src/lib/auditoria";
import { conPlataforma } from "../src/lib/db";
import { crearBarberia } from "../src/lib/servicios/barberias";
import { generarSlug } from "../src/lib/validacion/esquemas";

function argumentos(): Record<string, string> {
  const args = process.argv.slice(2);
  const r: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) r[args[i].replace(/^--/, "")] = args[i + 1] ?? "";
  return r;
}

async function main() {
  const a = argumentos();
  if (!a.nombre || !a.dueno || !a.email || !a.password) {
    console.error('Uso: npm run crear-barberia -- --nombre "..." --dueno "..." --email ... --password ... [--slug ...] [--plan "Básico"]');
    process.exit(1);
  }
  const barberia = await conPlataforma(async (db) => {
    const plan = a.plan
      ? await db.plan.findUnique({ where: { name: a.plan } })
      : await db.plan.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    if (!plan) throw new Error("No se encontró el plan. Ejecuta primero: npm run db:seed");
    return crearBarberia(db, {
      nombre: a.nombre, slug: a.slug || generarSlug(a.nombre), planId: plan.id,
      dueno: { nombre: a.dueno, email: a.email, password: a.password },
    }, ACTOR_SISTEMA);
  });
  console.log(`✔ Barbería creada: /${barberia.slug} (prueba hasta ${barberia.trialEndsAt.toISOString().slice(0, 10)})`);
  console.log(`  El dueño ingresa en /ingresar con ${barberia.owners[0].email}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("✖", e.message ?? e); process.exit(1); });
