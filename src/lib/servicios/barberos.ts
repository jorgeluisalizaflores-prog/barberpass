// Gestión de barberos por parte del dueño, respetando el límite del plan.
import { auditar, type Actor } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { conBarberia, infraestructura, type Db } from "../db";
import { nombreSchema, pinSchema } from "../validacion/esquemas";
import { ErrorNegocio } from "./errores";

/** Lanza un error si ya se alcanzó el máximo de barberos ACTIVOS del plan. */
async function exigirCupo(db: Db): Promise<void> {
  const barberia = await db.barbershop.findFirstOrThrow({ select: { plan: { select: { name: true, maxBarbers: true } } } });
  const max = barberia.plan.maxBarbers;
  if (max == null) return;
  const activos = await db.barber.count({ where: { active: true } });
  if (activos >= max) {
    throw new ErrorNegocio(
      `Tu plan ${barberia.plan.name} permite hasta ${max} barbero${max === 1 ? "" : "s"} activo${max === 1 ? "" : "s"}. Desactiva uno o mejora tu plan.`,
      "LIMITE_PLAN",
    );
  }
}

export async function crearBarbero(barbershopId: string, datos: { nombre: string; pin: string }, actor: Actor) {
  const nombre = nombreSchema.parse(datos.nombre);
  const pin = pinSchema.parse(datos.pin);
  const pinHash = await hashSecreto(pin);
  return conBarberia(barbershopId, async (db) => {
    await exigirCupo(db);
    const barbero = await db.barber.create({ data: { barbershopId, name: nombre, pinHash } });
    await auditar(db, { barbershopId, actor, accion: "barbero.crear", entidad: "Barber", entidadId: barbero.id, detalle: { nombre } });
    return barbero;
  });
}

export async function cambiarEstadoBarbero(barbershopId: string, barberId: string, activo: boolean, actor: Actor) {
  await conBarberia(barbershopId, async (db) => {
    const barbero = await db.barber.findFirst({ where: { id: barberId } });
    if (!barbero) throw new ErrorNegocio("Barbero no encontrado.", "NO_ENCONTRADO");
    if (barbero.active === activo) return;
    if (activo) await exigirCupo(db);
    await db.barber.update({ where: { id: barberId }, data: { active: activo } });
    await auditar(db, { barbershopId, actor, accion: activo ? "barbero.reactivar" : "barbero.desactivar", entidad: "Barber", entidadId: barberId, detalle: { nombre: barbero.name } });
  });
  // Al desactivarlo se cierran sus sesiones abiertas al instante.
  if (!activo) await infraestructura.session.deleteMany({ where: { barberId, barbershopId } });
}

export async function cambiarPinBarbero(barbershopId: string, barberId: string, pinNuevo: string, actor: Actor) {
  const pinHash = await hashSecreto(pinSchema.parse(pinNuevo));
  await conBarberia(barbershopId, async (db) => {
    const { count } = await db.barber.updateMany({ where: { id: barberId }, data: { pinHash } });
    if (count === 0) throw new ErrorNegocio("Barbero no encontrado.", "NO_ENCONTRADO");
    await auditar(db, { barbershopId, actor, accion: "barbero.cambiar_pin", entidad: "Barber", entidadId: barberId });
  });
  await infraestructura.session.deleteMany({ where: { barberId, barbershopId } });
}
