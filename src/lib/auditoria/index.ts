// Registro de auditoría: quién hizo qué y cuándo. Solo inserción.
import type { ActorRole, Prisma } from "@prisma/client";
import type { Db } from "../db";

export type Actor = {
  rol: ActorRole;
  id: string | null;
  nombre: string;
  /** Super administrador que actúa "como" la barbería (impersonación). */
  impersonadorId?: string | null;
  ip?: string | null;
};

export const ACTOR_SISTEMA: Actor = { rol: "SISTEMA", id: null, nombre: "Sistema" };

export async function auditar(
  db: Db,
  datos: {
    barbershopId: string | null;
    actor: Actor;
    accion: string;
    entidad?: string;
    entidadId?: string;
    detalle?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await db.auditLog.create({
    data: {
      barbershopId: datos.barbershopId,
      actorRole: datos.actor.rol,
      actorId: datos.actor.id,
      actorName: datos.actor.nombre,
      impersonatorId: datos.actor.impersonadorId ?? null,
      action: datos.accion,
      entity: datos.entidad,
      entityId: datos.entidadId,
      detail: datos.detalle,
      ip: datos.actor.ip ?? null,
    },
  });
}
