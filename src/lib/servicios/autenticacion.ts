// Verificación de credenciales para cada rol, con límite de intentos.
// No toca cookies: quien llama (una acción del servidor) crea la sesión.
import { ACTOR_SISTEMA, auditar } from "../auditoria";
import { hashSecreto, verificarContraRelleno, verificarSecreto } from "../auth/hash";
import { comprobarLimite, limpiarFallos, mensajeBloqueo, registrarFallo } from "../auth/limite";
import { LIMITE_INTENTOS } from "../config";
import { conBarberia, conPlataforma } from "../db";
import { emailSchema, pinSchema } from "../validacion/esquemas";

type Fallo = { ok: false; error: string };
const CREDENCIALES_INVALIDAS = "Correo o contraseña incorrectos.";

async function bloqueoPrevio(claveCuenta: string, claveIp: string): Promise<Fallo | null> {
  const porCuenta = await comprobarLimite(claveCuenta);
  if (porCuenta.bloqueado) return { ok: false, error: mensajeBloqueo(porCuenta) };
  const porIp = await comprobarLimite(claveIp, LIMITE_INTENTOS.maxPorIp);
  if (porIp.bloqueado) return { ok: false, error: mensajeBloqueo(porIp) };
  return null;
}

export async function autenticarSuperAdmin(
  emailCrudo: string, password: string, ip: string,
): Promise<{ ok: true; superAdminId: string; nombre: string } | Fallo> {
  const email = emailSchema.safeParse(emailCrudo);
  if (!email.success || !password) return { ok: false, error: CREDENCIALES_INVALIDAS };
  const claves = [`admin:${email.data}`, `ip:${ip}`] as const;
  const bloqueo = await bloqueoPrevio(...claves);
  if (bloqueo) return bloqueo;

  const admin = await conPlataforma((db) => db.superAdmin.findUnique({ where: { email: email.data } }));
  const valido = admin ? await verificarSecreto(admin.passwordHash, password) : await verificarContraRelleno(password);
  if (!admin || !valido) {
    await registrarFallo(...claves);
    return { ok: false, error: CREDENCIALES_INVALIDAS };
  }
  await limpiarFallos(claves[0]);
  await conPlataforma((db) =>
    auditar(db, { barbershopId: null, actor: { rol: "SUPER_ADMIN", id: admin.id, nombre: admin.name, ip }, accion: "admin.ingresar" }),
  );
  return { ok: true, superAdminId: admin.id, nombre: admin.name };
}

export async function autenticarDueno(
  emailCrudo: string, password: string, ip: string,
): Promise<{ ok: true; ownerUserId: string; barbershopId: string; slug: string } | Fallo> {
  const email = emailSchema.safeParse(emailCrudo);
  if (!email.success || !password) return { ok: false, error: CREDENCIALES_INVALIDAS };
  const claves = [`dueno:${email.data}`, `ip:${ip}`] as const;
  const bloqueo = await bloqueoPrevio(...claves);
  if (bloqueo) return bloqueo;

  // El correo es único en toda la plataforma: se busca con acceso de plataforma
  // y se devuelve solo lo mínimo.
  const dueno = await conPlataforma((db) =>
    db.ownerUser.findUnique({
      where: { email: email.data },
      select: { id: true, name: true, passwordHash: true, barbershopId: true, barbershop: { select: { slug: true } } },
    }),
  );
  const valido = dueno ? await verificarSecreto(dueno.passwordHash, password) : await verificarContraRelleno(password);
  if (!dueno || !valido) {
    await registrarFallo(...claves);
    return { ok: false, error: CREDENCIALES_INVALIDAS };
  }
  await limpiarFallos(claves[0]);
  await conBarberia(dueno.barbershopId, (db) =>
    auditar(db, { barbershopId: dueno.barbershopId, actor: { rol: "DUENO", id: dueno.id, nombre: dueno.name, ip }, accion: "dueno.ingresar" }),
  );
  return { ok: true, ownerUserId: dueno.id, barbershopId: dueno.barbershopId, slug: dueno.barbershop.slug };
}

export async function autenticarBarbero(
  barbershopId: string, barberId: string, pin: string, ip: string,
): Promise<{ ok: true; barberId: string; nombre: string } | Fallo> {
  const PIN_INVALIDO = "PIN incorrecto.";
  if (!pinSchema.safeParse(pin).success || !barberId) return { ok: false, error: PIN_INVALIDO };
  const claves = [`pin:${barbershopId}:${barberId}`, `pin-ip:${barbershopId}:${ip}`] as const;
  const bloqueo = await bloqueoPrevio(...claves);
  if (bloqueo) return bloqueo;

  // Búsqueda limitada a la barbería: un barbero de otra barbería no existe aquí.
  const barbero = await conBarberia(barbershopId, (db) => db.barber.findFirst({ where: { id: barberId, active: true } }));
  const valido = barbero ? await verificarSecreto(barbero.pinHash, pin) : await verificarContraRelleno(pin);
  if (!barbero || !valido) {
    await registrarFallo(...claves);
    return { ok: false, error: PIN_INVALIDO };
  }
  await limpiarFallos(claves[0]);
  await conBarberia(barbershopId, (db) =>
    auditar(db, { barbershopId, actor: { rol: "BARBERO", id: barbero.id, nombre: barbero.name, ip }, accion: "barbero.ingresar" }),
  );
  return { ok: true, barberId: barbero.id, nombre: barbero.name };
}

/** Verifica el PIN de autorización del dueño (para el sello extra del día). */
export async function verificarPinDueno(barbershopId: string, pin: string, ip: string): Promise<{ ok: true } | Fallo> {
  const clave = `pin-dueno:${barbershopId}`;
  const limite = await comprobarLimite(clave);
  if (limite.bloqueado) return { ok: false, error: mensajeBloqueo(limite) };
  const b = await conBarberia(barbershopId, (db) => db.barbershop.findFirst({ select: { ownerPinHash: true } }));
  if (!b?.ownerPinHash) return { ok: false, error: "El dueño aún no configuró su PIN de autorización." };
  if (!pinSchema.safeParse(pin).success || !(await verificarSecreto(b.ownerPinHash, pin))) {
    await registrarFallo(clave, `pin-ip:${barbershopId}:${ip}`);
    return { ok: false, error: "PIN de autorización incorrecto." };
  }
  await limpiarFallos(clave);
  return { ok: true };
}

/** Crea o actualiza el super administrador (script de consola). */
export async function guardarSuperAdmin(email: string, nombre: string, password: string) {
  const passwordHash = await hashSecreto(password);
  return conPlataforma(async (db) => {
    const admin = await db.superAdmin.upsert({
      where: { email }, create: { email, name: nombre, passwordHash }, update: { name: nombre, passwordHash },
    });
    await auditar(db, { barbershopId: null, actor: ACTOR_SISTEMA, accion: "admin.guardar", entidad: "SuperAdmin", entidadId: admin.id });
    return admin;
  });
}
