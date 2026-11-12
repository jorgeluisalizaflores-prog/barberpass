// Servicios del super administrador. Todos usan conPlataforma() (acceso global)
// y dejan registro de auditoría con el usuario que los ejecutó.
import type { PaymentMethod, Prisma } from "@prisma/client";
import { z } from "zod";
import { auditar, type Actor } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { conPlataforma, infraestructura } from "../db";
import { diaMesLima, inicioDiaLima } from "../fechas";
import { PROVEEDOR_MANUAL } from "../pagos";
import { calcularPeriodoPago, calcularSuscripcion, type ResumenSuscripcion } from "../suscripcion/estado";
import { celularSchema, nombreSchema, passwordSchema, slugSchema } from "../validacion/esquemas";
import { ErrorNegocio } from "./errores";

function exigirAdmin(actor: Actor): void {
  if (actor.rol !== "SUPER_ADMIN" || !actor.id) throw new ErrorNegocio("Acción reservada al super administrador.", "PROHIBIDO");
}

async function config(db: Prisma.TransactionClient) {
  const c = await db.platformSettings.findUnique({ where: { id: 1 } });
  return { graceDays: c?.graceDays ?? 5, expiringNoticeDays: c?.expiringNoticeDays ?? 7 };
}

export type FiltroEstado = "" | "PRUEBA" | "ACTIVA" | "VENCIDA" | "SUSPENDIDA" | "POR_VENCER";

/** Lista de barberías con su estado de suscripción calculado. */
export async function listarBarberias(filtro: { q?: string; estado?: FiltroEstado } = {}, ahora: Date = new Date()) {
  return conPlataforma(async (db) => {
    const cfg = await config(db);
    const q = filtro.q?.trim();
    const filas = await db.barbershop.findMany({
      where: q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { slug: { contains: q.toLowerCase() } }, { owners: { some: { email: { contains: q.toLowerCase() } } } }] } : {},
      orderBy: { createdAt: "desc" },
      select: {
        id: true, slug: true, name: true, city: true, status: true, trialEndsAt: true, paidUntil: true, isDemo: true, createdAt: true,
        plan: { select: { name: true, priceMonthly: true } }, owners: { select: { email: true, name: true }, take: 1 },
        _count: { select: { customers: true, barbers: true } },
      },
    });
    const conEstado = filas.map((b) => ({ ...b, suscripcion: calcularSuscripcion(b, cfg, ahora) }));
    const coincide = (s: ResumenSuscripcion) => {
      switch (filtro.estado) {
        case "PRUEBA": return s.estado === "PRUEBA";
        case "ACTIVA": return s.estado === "ACTIVA";
        case "VENCIDA": return s.estado === "EN_GRACIA" || s.estado === "VENCIDA";
        case "SUSPENDIDA": return s.estado === "SUSPENDIDA";
        case "POR_VENCER": return s.porVencer;
        default: return true;
      }
    };
    return conEstado.filter((b) => coincide(b.suscripcion));
  });
}

/** Métricas globales de la plataforma. */
export async function metricasGlobales(ahora: Date = new Date()) {
  const barberias = (await listarBarberias({}, ahora)).filter((b) => !b.isDemo);
  const { anio, mes } = diaMesLima(ahora);
  const inicioMes = inicioDiaLima(`${anio}-${String(mes).padStart(2, "0")}-01`);
  const estado = (e: string[]) => barberias.filter((b) => e.includes(b.suscripcion.estado));
  const activas = estado(["ACTIVA"]);

  const totales = await conPlataforma(async (db) => {
    const demo = { barbershop: { isDemo: false } };
    const [clientes, sellos, canjes, ingresosMes, ingresosTotal] = await Promise.all([
      db.customer.count({ where: demo }),
      db.stamp.aggregate({ where: demo, _sum: { quantity: true } }),
      db.redemption.count({ where: demo }),
      db.payment.aggregate({ where: { paidAt: { gte: inicioMes } }, _sum: { amount: true } }),
      db.payment.aggregate({ _sum: { amount: true } }),
    ]);
    return { clientes, sellos: sellos._sum.quantity ?? 0, canjes, ingresosMes: Number(ingresosMes._sum.amount ?? 0), ingresosTotal: Number(ingresosTotal._sum.amount ?? 0) };
  });

  return {
    total: barberias.length,
    activas: activas.length,
    enPrueba: estado(["PRUEBA"]).length,
    vencidas: estado(["EN_GRACIA", "VENCIDA"]).length,
    suspendidas: estado(["SUSPENDIDA"]).length,
    // MRR: suma del precio mensual del plan de las barberías con pago vigente.
    mrr: activas.reduce((s, b) => s + Number(b.plan.priceMonthly), 0),
    porVencer: barberias.filter((b) => b.suscripcion.porVencer).sort((a, b) => (a.suscripcion.diasRestantes ?? 0) - (b.suscripcion.diasRestantes ?? 0)),
    ...totales,
  };
}

export async function detalleBarberia(id: string) {
  return conPlataforma(async (db) => {
    const b = await db.barbershop.findUnique({
      where: { id },
      omit: { logoData: true, ownerPinHash: true },
      include: {
        plan: true, owners: { select: { id: true, name: true, email: true, createdAt: true } },
        payments: { orderBy: { paidAt: "desc" }, take: 50 },
        _count: { select: { customers: true, barbers: true, stamps: true, redemptions: true } },
      },
    });
    if (!b) return null;
    return { ...b, suscripcion: calcularSuscripcion(b, await config(db)) };
  });
}

const edicionSchema = z.object({
  name: nombreSchema,
  slug: slugSchema,
  planId: z.string().min(1),
  phone: z.union([z.literal(""), celularSchema]),
  city: z.string().trim().max(60),
  trialEndsAt: z.coerce.date(),
});

export async function editarBarberia(id: string, entrada: unknown, actor: Actor) {
  exigirAdmin(actor);
  const data = edicionSchema.parse(entrada);
  return conPlataforma(async (db) => {
    const otra = await db.barbershop.findUnique({ where: { slug: data.slug }, select: { id: true } });
    if (otra && otra.id !== id) throw new ErrorNegocio("Esa dirección (slug) ya la usa otra barbería.", "SLUG_EN_USO");
    if (!(await db.plan.findUnique({ where: { id: data.planId } }))) throw new ErrorNegocio("El plan no existe.", "PLAN_INEXISTENTE");
    const b = await db.barbershop.update({ where: { id }, data });
    await auditar(db, { barbershopId: id, actor, accion: "admin.barberia.editar", entidad: "Barbershop", entidadId: id, detalle: { ...data, trialEndsAt: data.trialEndsAt.toISOString() } });
    return b;
  });
}

export async function suspenderBarberia(id: string, motivo: string, actor: Actor) {
  exigirAdmin(actor);
  await conPlataforma(async (db) => {
    await db.barbershop.update({ where: { id }, data: { status: "SUSPENDIDA", suspendedNote: motivo.trim().slice(0, 300) } });
    await auditar(db, { barbershopId: id, actor, accion: "admin.barberia.suspender", entidad: "Barbershop", entidadId: id, detalle: { motivo } });
  });
  // Se cierran las sesiones abiertas de dueños y barberos de esa barbería.
  await infraestructura.session.deleteMany({ where: { barbershopId: id, impersonatorId: null } });
}

export async function reactivarBarberia(id: string, actor: Actor) {
  exigirAdmin(actor);
  await conPlataforma(async (db) => {
    const b = await db.barbershop.findUniqueOrThrow({ where: { id }, select: { paidUntil: true } });
    // Vuelve al estado que le corresponde: activa si alguna vez pagó, si no en prueba.
    await db.barbershop.update({ where: { id }, data: { status: b.paidUntil ? "ACTIVA" : "PRUEBA", suspendedNote: "" } });
    await auditar(db, { barbershopId: id, actor, accion: "admin.barberia.reactivar", entidad: "Barbershop", entidadId: id });
  });
}

const pagoSchema = z.object({
  monto: z.coerce.number().positive("El monto debe ser mayor a 0").max(100000),
  metodo: z.enum(["YAPE", "PLIN", "TRANSFERENCIA", "EFECTIVO", "OTRO"]),
  fecha: z.coerce.date(),
  meses: z.coerce.number().int().min(1, "Mínimo 1 mes").max(24, "Máximo 24 meses"),
  nota: z.string().trim().max(300).default(""),
});

/**
 * Registra un pago manual (Yape, Plin, transferencia…) y calcula el nuevo
 * vencimiento. En la fase 2, el webhook de la pasarela llamará a esta misma
 * función con `provider` y `externalRef`.
 */
export async function registrarPago(barbershopId: string, entrada: unknown, actor: Actor, origen: { provider?: string; externalRef?: string } = {}) {
  exigirAdmin(actor);
  const d = pagoSchema.parse(entrada);
  if (d.fecha.getTime() > Date.now() + 86_400_000) throw new ErrorNegocio("La fecha del pago no puede ser futura.", "FECHA");
  return conPlataforma(async (db) => {
    const b = await db.barbershop.findUnique({ where: { id: barbershopId }, select: { trialEndsAt: true, paidUntil: true, status: true, planId: true, isDemo: true } });
    if (!b) throw new ErrorNegocio("Barbería no encontrada.", "NO_ENCONTRADO");
    if (b.isDemo) throw new ErrorNegocio("La barbería demo no registra pagos.", "DEMO");
    const { periodStart, periodEnd } = calcularPeriodoPago(b, d.fecha, d.meses);
    const pago = await db.payment.create({
      data: {
        barbershopId, planId: b.planId, amount: d.monto, method: d.metodo as PaymentMethod, paidAt: d.fecha, months: d.meses,
        periodStart, periodEnd, note: d.nota, recordedById: actor.id, provider: origen.provider ?? PROVEEDOR_MANUAL, externalRef: origen.externalRef,
      },
    });
    // Una barbería suspendida sigue suspendida hasta que se la reactive a mano.
    await db.barbershop.update({ where: { id: barbershopId }, data: { paidUntil: periodEnd, status: b.status === "SUSPENDIDA" ? "SUSPENDIDA" : "ACTIVA" } });
    await auditar(db, {
      barbershopId, actor, accion: "pago.registrar", entidad: "Payment", entidadId: pago.id,
      detalle: { monto: d.monto, metodo: d.metodo, meses: d.meses, fecha: d.fecha.toISOString(), periodoDesde: periodStart.toISOString(), periodoHasta: periodEnd.toISOString(), nota: d.nota },
    });
    return pago;
  });
}

export async function restablecerPasswordDueno(ownerUserId: string, passwordNueva: string, actor: Actor) {
  exigirAdmin(actor);
  const passwordHash = await hashSecreto(passwordSchema.parse(passwordNueva));
  await conPlataforma(async (db) => {
    const dueno = await db.ownerUser.update({ where: { id: ownerUserId }, data: { passwordHash } });
    await auditar(db, { barbershopId: dueno.barbershopId, actor, accion: "admin.dueno.restablecer_password", entidad: "OwnerUser", entidadId: dueno.id });
  });
  await infraestructura.session.deleteMany({ where: { ownerUserId } });
}

/** Deja constancia de que el super administrador entró "como" una barbería. */
export async function registrarImpersonacion(barbershopId: string, actor: Actor) {
  exigirAdmin(actor);
  return conPlataforma(async (db) => {
    const b = await db.barbershop.findUnique({ where: { id: barbershopId }, select: { id: true, slug: true, name: true } });
    if (!b) throw new ErrorNegocio("Barbería no encontrada.", "NO_ENCONTRADO");
    await auditar(db, { barbershopId, actor: { ...actor, impersonadorId: actor.id }, accion: "admin.impersonar", entidad: "Barbershop", entidadId: barbershopId, detalle: { barberia: b.name } });
    return b;
  });
}

// ── Planes ──
const planSchema = z.object({
  name: z.string().trim().min(2).max(40),
  description: z.string().trim().max(200).default(""),
  priceMonthly: z.coerce.number().min(0).max(100000),
  maxBarbers: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(1).max(500)]).nullable(),
  maxCustomers: z.union([z.literal("").transform(() => null), z.coerce.number().int().min(1).max(10_000_000)]).nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export async function guardarPlan(id: string | null, entrada: unknown, actor: Actor) {
  exigirAdmin(actor);
  const data = planSchema.parse(entrada);
  return conPlataforma(async (db) => {
    const repetido = await db.plan.findUnique({ where: { name: data.name }, select: { id: true } });
    if (repetido && repetido.id !== id) throw new ErrorNegocio("Ya existe un plan con ese nombre.", "PLAN_REPETIDO");
    const plan = id ? await db.plan.update({ where: { id }, data }) : await db.plan.create({ data });
    await auditar(db, { barbershopId: null, actor, accion: id ? "admin.plan.editar" : "admin.plan.crear", entidad: "Plan", entidadId: plan.id, detalle: data });
    return plan;
  });
}

const configSchema = z.object({
  trialDays: z.coerce.number().int().min(1).max(90),
  graceDays: z.coerce.number().int().min(0).max(60),
  expiringNoticeDays: z.coerce.number().int().min(1).max(30),
  contactWhatsapp: z.union([z.literal(""), celularSchema]),
  basePrivacyPolicy: z.string().trim().max(20000),
});

export async function guardarConfiguracion(entrada: unknown, actor: Actor) {
  exigirAdmin(actor);
  const data = configSchema.parse(entrada);
  await conPlataforma(async (db) => {
    await db.platformSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await auditar(db, { barbershopId: null, actor, accion: "admin.configuracion.guardar", detalle: { ...data, basePrivacyPolicy: `${data.basePrivacyPolicy.length} caracteres` } });
  });
}

export async function listarAuditoria(filtro: { barbershopId?: string; accion?: string; pagina?: number }) {
  const POR_PAGINA = 50;
  const pagina = Math.max(1, filtro.pagina || 1);
  const where: Prisma.AuditLogWhereInput = {
    ...(filtro.barbershopId ? { barbershopId: filtro.barbershopId } : {}),
    ...(filtro.accion ? { action: { startsWith: filtro.accion } } : {}),
  };
  return conPlataforma(async (db) => {
    const [total, filas] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (pagina - 1) * POR_PAGINA, take: POR_PAGINA }),
    ]);
    const ids = [...new Set(filas.map((f) => f.barbershopId).filter((x): x is string => !!x))];
    const nombres = await db.barbershop.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
    return { total, pagina, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)), filas: filas.map((f) => ({ ...f, barberia: nombres.find((n) => n.id === f.barbershopId)?.name ?? null })) };
  });
}

export async function listarPagos(limite = 100) {
  return conPlataforma((db) =>
    db.payment.findMany({ orderBy: { paidAt: "desc" }, take: limite, include: { barbershop: { select: { id: true, name: true, slug: true } }, plan: { select: { name: true } } } }),
  );
}

