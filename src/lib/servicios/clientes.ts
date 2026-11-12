// Registro de clientes finales y consulta de su tarjeta.
import { auditar } from "../auditoria";
import { comprobarLimite, registrarFallo } from "../auth/limite";
import { conBarberia } from "../db";
import { fechaLocalLima } from "../fechas";
import { tokenSeguro } from "../tokens";
import { registroClienteSchema } from "../validacion/esquemas";
import { ErrorNegocio, esDuplicado } from "./errores";

const MAX_REGISTROS_POR_IP = 10;

export const MENSAJE_DUPLICADO =
  "Este celular ya tiene una tarjeta en esta barbería. Pídele a tu barbero que te reenvíe el enlace de tu tarjeta.";

/**
 * Registra un cliente en UNA barbería. El mismo celular puede registrarse en
 * otras barberías (tarjetas separadas), pero no dos veces en la misma.
 */
export async function registrarCliente(barbershopId: string, entrada: unknown, ip: string): Promise<{ cardToken: string }> {
  const datos = registroClienteSchema.parse(entrada);

  // Freno contra registros masivos automatizados desde una misma IP.
  const claveIp = `registro:${barbershopId}:${ip}`;
  if ((await comprobarLimite(claveIp, MAX_REGISTROS_POR_IP)).bloqueado) {
    throw new ErrorNegocio("Se hicieron demasiados registros desde esta conexión. Inténtalo más tarde.", "LIMITE");
  }

  try {
    const cliente = await conBarberia(barbershopId, async (db) => {
      const barberia = await db.barbershop.findFirstOrThrow({
        select: { welcomeStampEnabled: true, welcomeStamps: true, plan: { select: { maxCustomers: true } } },
      });

      if (await db.customer.findFirst({ where: { phone: datos.celular }, select: { id: true } })) {
        throw new ErrorNegocio(MENSAJE_DUPLICADO, "DUPLICADO");
      }
      const maximo = barberia.plan.maxCustomers;
      if (maximo != null && (await db.customer.count()) >= maximo) {
        throw new ErrorNegocio("Esta barbería alcanzó el máximo de clientes de su plan. Avísale al personal.", "LIMITE_PLAN");
      }

      const sellosBienvenida = barberia.welcomeStampEnabled ? Math.max(0, barberia.welcomeStamps) : 0;
      const ahora = new Date();
      const nuevo = await db.customer.create({
        data: {
          barbershopId,
          name: datos.nombre,
          phone: datos.celular,
          birthDay: datos.cumpleDia ?? null,
          birthMonth: datos.cumpleMes ?? null,
          cardToken: tokenSeguro(),
          qrToken: tokenSeguro(),
          privacyAcceptedAt: ahora,
          whatsappOptIn: datos.aceptaWhatsapp,
          whatsappOptInAt: datos.aceptaWhatsapp ? ahora : null,
          stampsCount: sellosBienvenida,
          totalStamps: sellosBienvenida,
        },
      });
      if (sellosBienvenida > 0) {
        await db.stamp.create({
          data: { barbershopId, customerId: nuevo.id, type: "BIENVENIDA", quantity: sellosBienvenida, localDate: fechaLocalLima(ahora) },
        });
      }
      await auditar(db, {
        barbershopId, actor: { rol: "CLIENTE", id: nuevo.id, nombre: nuevo.name, ip },
        accion: "cliente.registrar", entidad: "Customer", entidadId: nuevo.id,
        detalle: { aceptaPrivacidad: true, aceptaWhatsapp: datos.aceptaWhatsapp, sellosBienvenida },
      });
      return nuevo;
    });
    await registrarFallo(claveIp);
    return { cardToken: cliente.cardToken };
  } catch (e) {
    // Dos registros simultáneos con el mismo celular: gana uno, el otro ve el aviso.
    if (esDuplicado(e)) throw new ErrorNegocio(MENSAJE_DUPLICADO, "DUPLICADO");
    throw e;
  }
}

export type MovimientoTarjeta = { id: string; fecha: Date; tipo: "CORTE" | "BIENVENIDA" | "EXTRA_AUTORIZADO" | "CANJE"; barbero: string | null; cantidad: number; detalle?: string };

/** Tarjeta de un cliente por su token secreto, SOLO dentro de la barbería dada. */
export async function obtenerTarjeta(barbershopId: string, cardToken: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(cardToken)) return null;
  return conBarberia(barbershopId, async (db) => {
    const cliente = await db.customer.findFirst({
      where: { cardToken },
      select: { id: true, name: true, stampsCount: true, totalStamps: true, totalRedemptions: true, qrToken: true, cardToken: true, createdAt: true },
    });
    if (!cliente) return null;
    return { cliente, historial: await historialCliente(db, cliente.id) };
  });
}

/** Historial combinado de sellos y canjes, del más reciente al más antiguo. */
export async function historialCliente(db: Parameters<Parameters<typeof conBarberia>[1]>[0], customerId: string, limite = 30): Promise<MovimientoTarjeta[]> {
  const [sellos, canjes] = await Promise.all([
    db.stamp.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: limite, include: { barber: { select: { name: true } } } }),
    db.redemption.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, take: limite, include: { barber: { select: { name: true } } } }),
  ]);
  const movimientos: MovimientoTarjeta[] = [
    ...sellos.map((s) => ({ id: s.id, fecha: s.createdAt, tipo: s.type, barbero: s.barber?.name ?? null, cantidad: s.quantity })),
    ...canjes.map((c) => ({ id: c.id, fecha: c.createdAt, tipo: "CANJE" as const, barbero: c.barber?.name ?? null, cantidad: c.stampsUsed, detalle: c.rewardText })),
  ];
  return movimientos.sort((a, b) => b.fecha.getTime() - a.fecha.getTime()).slice(0, limite);
}
