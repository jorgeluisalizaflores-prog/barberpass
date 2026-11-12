// Sellos y canjes: el corazón del programa de fidelidad.
// Cada operación es atómica (una transacción) y deja registro de auditoría.
import { auditar, type Actor } from "../auditoria";
import { conBarberia } from "../db";
import { fechaLocalLima } from "../fechas";
import { calcularTarjeta } from "../fidelidad/tarjeta";
import { verificarPinDueno } from "./autenticacion";
import { ErrorNegocio, esDuplicado } from "./errores";

export const MENSAJE_YA_SELLADO = "Este cliente ya recibió su sello de hoy. Para sumar otro se necesita la autorización del dueño.";

type Operacion = {
  customerId: string;
  /** Barbero que atiende (null si lo hace el dueño desde su panel). */
  barberId: string | null;
  actor: Actor;
};

/**
 * Suma 1 sello por un corte. Regla: máximo 1 sello por cliente por día (hora
 * de Lima). Para un segundo sello el mismo día hay que pasar `pinDueno`.
 */
export async function sumarSello(barbershopId: string, op: Operacion & { pinDueno?: string }) {
  const ahora = new Date();
  const hoy = fechaLocalLima(ahora);
  const extra = op.pinDueno !== undefined;

  if (extra) {
    const pin = await verificarPinDueno(barbershopId, op.pinDueno!, op.actor.ip ?? "desconocida");
    if (!pin.ok) throw new ErrorNegocio(pin.error, "PIN_INVALIDO");
  }

  try {
    return await conBarberia(barbershopId, async (db) => {
      const barberia = await db.barbershop.findFirstOrThrow({ select: { stampsRequired: true, rewardText: true } });
      const cliente = await db.customer.findFirst({ where: { id: op.customerId }, select: { id: true, name: true, stampsCount: true } });
      if (!cliente) throw new ErrorNegocio("Cliente no encontrado en esta barbería.", "NO_ENCONTRADO");

      if (!extra) {
        const yaHoy = await db.stamp.findFirst({ where: { customerId: cliente.id, localDate: hoy, type: { in: ["CORTE", "EXTRA_AUTORIZADO"] } }, select: { id: true } });
        if (yaHoy) throw new ErrorNegocio(MENSAJE_YA_SELLADO, "YA_SELLADO_HOY");
      }

      const sello = await db.stamp.create({
        data: {
          barbershopId, customerId: cliente.id, barberId: op.barberId, localDate: hoy,
          type: extra ? "EXTRA_AUTORIZADO" : "CORTE",
          // La restricción única sobre dailyKey frena el doble clic y a dos barberos a la vez.
          dailyKey: extra ? null : `${cliente.id}:${hoy}`,
        },
      });
      const actualizado = await db.customer.update({
        where: { id: cliente.id },
        data: { stampsCount: { increment: 1 }, totalStamps: { increment: 1 }, lastVisitAt: ahora },
        select: { stampsCount: true },
      });
      await auditar(db, {
        barbershopId, actor: op.actor, accion: extra ? "sello.sumar_extra" : "sello.sumar", entidad: "Stamp", entidadId: sello.id,
        detalle: { cliente: cliente.name, clienteId: cliente.id, sellosAntes: cliente.stampsCount, sellosDespues: actualizado.stampsCount, autorizadoConPinDueno: extra },
      });
      return { selloId: sello.id, sellos: actualizado.stampsCount, tarjeta: calcularTarjeta(actualizado.stampsCount, barberia.stampsRequired, barberia.rewardText) };
    });
  } catch (e) {
    if (esDuplicado(e)) throw new ErrorNegocio(MENSAJE_YA_SELLADO, "YA_SELLADO_HOY");
    throw e;
  }
}

/** Canjea una recompensa: descuenta N sellos (el contador se reinicia). */
export async function canjearRecompensa(barbershopId: string, op: Operacion) {
  return conBarberia(barbershopId, async (db) => {
    const barberia = await db.barbershop.findFirstOrThrow({ select: { stampsRequired: true, rewardText: true } });
    const n = barberia.stampsRequired;

    // Descuento condicional y atómico: si dos barberos canjean a la vez, solo
    // uno encuentra sellos suficientes.
    const { count } = await db.customer.updateMany({
      where: { id: op.customerId, stampsCount: { gte: n } },
      data: { stampsCount: { decrement: n }, totalRedemptions: { increment: 1 }, lastVisitAt: new Date() },
    });
    if (count === 0) throw new ErrorNegocio("Este cliente no tiene una recompensa disponible para canjear.", "SIN_RECOMPENSA");

    const cliente = await db.customer.findFirstOrThrow({ where: { id: op.customerId }, select: { id: true, name: true, stampsCount: true } });
    const canje = await db.redemption.create({
      data: { barbershopId, customerId: cliente.id, barberId: op.barberId, stampsUsed: n, rewardText: barberia.rewardText },
    });
    await auditar(db, {
      barbershopId, actor: op.actor, accion: "recompensa.canjear", entidad: "Redemption", entidadId: canje.id,
      detalle: { cliente: cliente.name, clienteId: cliente.id, recompensa: barberia.rewardText, sellosUsados: n, sellosRestantes: cliente.stampsCount },
    });
    return { canjeId: canje.id, sellos: cliente.stampsCount, tarjeta: calcularTarjeta(cliente.stampsCount, n, barberia.rewardText) };
  });
}

/** Búsqueda rápida por celular (si son dígitos) o por nombre. */
export async function buscarClientes(barbershopId: string, consulta: string, limite = 20) {
  const q = consulta.trim();
  if (q.length < 2) return [];
  const digitos = q.replace(/[\s-]/g, "");
  const where = /^\+?\d+$/.test(digitos)
    ? { phone: { contains: digitos.replace(/^\+?51(?=9)/, "") } }
    : { name: { contains: q, mode: "insensitive" as const } };
  return conBarberia(barbershopId, (db) =>
    db.customer.findMany({
      where, take: limite, orderBy: [{ lastVisitAt: { sort: "desc", nulls: "last" } }, { name: "asc" }],
      select: { id: true, name: true, phone: true, stampsCount: true, lastVisitAt: true },
    }),
  );
}
