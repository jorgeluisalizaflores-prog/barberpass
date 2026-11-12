// Consultas del panel del dueño: métricas, listas de clientes y exportación.
// Todas corren dentro de conBarberia(): no pueden ver otra barbería.
import type { Prisma } from "@prisma/client";
import { auditar, type Actor } from "../auditoria";
import { conBarberia } from "../db";
import { diaMesLima, fechaLocalLima, inicioDiaLima, MESES, sumarDias } from "../fechas";

export type Serie = { etiqueta: string; valor: number }[];

function lunesDe(fechaLocal: string): string {
  const d = new Date(`${fechaLocal}T00:00:00Z`);
  const dia = (d.getUTCDay() + 6) % 7; // lunes = 0
  return new Date(d.getTime() - dia * 86_400_000).toISOString().slice(0, 10);
}

/** "Cortes" = sellos por corte (normales o extra) + cortes gratis canjeados. */
export async function obtenerMetricas(barbershopId: string, ahora: Date = new Date()) {
  const hoy = fechaLocalLima(ahora);
  const { anio, mes } = diaMesLima(ahora);
  const inicioSemana = inicioDiaLima(lunesDe(hoy));
  const inicioMes = inicioDiaLima(`${anio}-${String(mes).padStart(2, "0")}-01`);
  const hace30 = sumarDias(ahora, -30);
  // Ventanas de las series: 8 semanas y 6 meses.
  const primerLunes = sumarDias(inicioSemana, -7 * 7);
  const primerMes = new Date(Date.UTC(anio, mes - 1 - 5, 1, 5));

  return conBarberia(barbershopId, async (db) => {
    const esCorte: Prisma.StampWhereInput = { type: { in: ["CORTE", "EXTRA_AUTORIZADO"] } };
    const [clientes, nuevosMes, activos30, sellosSemana, canjesSemana, sellosMes, canjesMes, canjesTotal, barberos, sellosPorBarbero, canjesPorBarbero] = await Promise.all([
      db.customer.count(),
      db.customer.count({ where: { createdAt: { gte: inicioMes } } }),
      db.customer.count({ where: { lastVisitAt: { gte: hace30 } } }),
      db.stamp.count({ where: { ...esCorte, createdAt: { gte: inicioSemana } } }),
      db.redemption.count({ where: { createdAt: { gte: inicioSemana } } }),
      db.stamp.count({ where: { ...esCorte, createdAt: { gte: inicioMes } } }),
      db.redemption.count({ where: { createdAt: { gte: inicioMes } } }),
      db.redemption.count(),
      db.barber.findMany({ select: { id: true, name: true, active: true }, orderBy: { name: "asc" } }),
      db.stamp.groupBy({ by: ["barberId"], where: { ...esCorte, createdAt: { gte: inicioMes } }, _count: { _all: true } }),
      db.redemption.groupBy({ by: ["barberId"], where: { createdAt: { gte: inicioMes } }, _count: { _all: true } }),
    ]);

    // Series por semana y por mes (en hora de Lima). El filtro por barbería va
    // explícito y además lo refuerza RLS.
    const desde = primerMes.getTime() < primerLunes.getTime() ? primerMes : primerLunes;
    const filas = await db.$queryRaw<{ semana: string; mes: string; n: number }[]>`
      SELECT to_char(date_trunc('week', local), 'YYYY-MM-DD') AS semana, to_char(local, 'YYYY-MM') AS mes, count(*)::int AS n
      FROM (
        SELECT ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima' AS local
        FROM "Stamp" WHERE "barbershopId" = ${barbershopId} AND type <> 'BIENVENIDA' AND "createdAt" >= ${desde}
        UNION ALL
        SELECT ("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Lima'
        FROM "Redemption" WHERE "barbershopId" = ${barbershopId} AND "createdAt" >= ${desde}
      ) x GROUP BY 1, 2`;

    const porSemana: Serie = Array.from({ length: 8 }, (_, i) => {
      const lunes = fechaLocalLima(sumarDias(primerLunes, i * 7));
      const [, m, d] = lunes.split("-");
      return { etiqueta: `${d}/${m}`, valor: filas.filter((f) => f.semana === lunes).reduce((s, f) => s + f.n, 0) };
    });
    const porMes: Serie = Array.from({ length: 6 }, (_, i) => {
      const f = new Date(Date.UTC(anio, mes - 1 - 5 + i, 1));
      const clave = f.toISOString().slice(0, 7);
      return { etiqueta: MESES[f.getUTCMonth()].slice(0, 3), valor: filas.filter((x) => x.mes === clave).reduce((s, x) => s + x.n, 0) };
    });

    const porBarbero = barberos
      .map((b) => ({
        id: b.id, nombre: b.name, activo: b.active,
        cortes: (sellosPorBarbero.find((s) => s.barberId === b.id)?._count._all ?? 0) + (canjesPorBarbero.find((c) => c.barberId === b.id)?._count._all ?? 0),
        canjes: canjesPorBarbero.find((c) => c.barberId === b.id)?._count._all ?? 0,
      }))
      .filter((b) => b.activo || b.cortes > 0)
      .sort((a, b) => b.cortes - a.cortes);

    return {
      clientes, nuevosMes, activos30,
      cortesSemana: sellosSemana + canjesSemana,
      cortesMes: sellosMes + canjesMes,
      canjesMes, canjesTotal, porSemana, porMes, porBarbero,
    };
  });
}

const POR_PAGINA = 25;

function filtroBusqueda(q: string): Prisma.CustomerWhereInput {
  const t = q.trim();
  if (!t) return {};
  const digitos = t.replace(/[\s-]/g, "");
  return /^\d+$/.test(digitos) ? { phone: { contains: digitos } } : { name: { contains: t, mode: "insensitive" } };
}

export async function listarClientes(barbershopId: string, q: string, pagina: number) {
  const where = filtroBusqueda(q);
  const p = Math.max(1, pagina || 1);
  return conBarberia(barbershopId, async (db) => {
    const [total, clientes] = await Promise.all([
      db.customer.count({ where }),
      db.customer.findMany({
        where, orderBy: { createdAt: "desc" }, skip: (p - 1) * POR_PAGINA, take: POR_PAGINA,
        select: { id: true, name: true, phone: true, stampsCount: true, totalStamps: true, totalRedemptions: true, lastVisitAt: true, createdAt: true, whatsappOptIn: true, cardToken: true, birthDay: true, birthMonth: true },
      }),
    ]);
    return { total, clientes, pagina: p, paginas: Math.max(1, Math.ceil(total / POR_PAGINA)) };
  });
}

/** Evita que Excel interprete un texto como fórmula (inyección CSV). */
function celda(valor: string | number | null | undefined): string {
  let s = valor == null ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function exportarClientesCsv(barbershopId: string, actor: Actor): Promise<string> {
  return conBarberia(barbershopId, async (db) => {
    const clientes = await db.customer.findMany({ orderBy: { createdAt: "asc" } });
    await auditar(db, { barbershopId, actor, accion: "clientes.exportar_csv", detalle: { cantidad: clientes.length } });
    const filas = [
      ["Nombre", "Celular", "Cumpleaños", "Sellos actuales", "Sellos acumulados", "Recompensas canjeadas", "Última visita", "Registrado", "Acepta WhatsApp"].map(celda).join(","),
      ...clientes.map((c) =>
        [
          c.name, c.phone, c.birthDay && c.birthMonth ? `${c.birthDay} de ${MESES[c.birthMonth - 1]}` : "",
          c.stampsCount, c.totalStamps, c.totalRedemptions,
          c.lastVisitAt ? fechaLocalLima(c.lastVisitAt) : "", fechaLocalLima(c.createdAt), c.whatsappOptIn ? "Sí" : "No",
        ].map(celda).join(","),
      ),
    ];
    // BOM para que Excel abra bien las tildes.
    return `﻿${filas.join("\r\n")}\r\n`;
  });
}

const CAMPOS_CONTACTO = { id: true, name: true, phone: true, stampsCount: true, lastVisitAt: true, createdAt: true, cardToken: true, birthDay: true, birthMonth: true, whatsappOptIn: true } as const;

/** Clientes que aceptaron mensajes y no vienen hace más de `dias` días. */
export async function clientesParaRecuperar(barbershopId: string, dias: number, ahora: Date = new Date()) {
  const corte = sumarDias(ahora, -dias);
  return conBarberia(barbershopId, (db) =>
    db.customer.findMany({
      where: { whatsappOptIn: true, OR: [{ lastVisitAt: { lt: corte } }, { lastVisitAt: null, createdAt: { lt: corte } }] },
      orderBy: [{ lastVisitAt: { sort: "asc", nulls: "first" } }], take: 200, select: CAMPOS_CONTACTO,
    }),
  );
}

/** Cumpleaños del mes en curso (hora de Lima), ordenados por día. */
export async function cumpleanosDelMes(barbershopId: string, ahora: Date = new Date()) {
  const { mes, dia } = diaMesLima(ahora);
  const clientes = await conBarberia(barbershopId, (db) =>
    db.customer.findMany({ where: { birthMonth: mes }, orderBy: [{ birthDay: "asc" }, { name: "asc" }], take: 500, select: CAMPOS_CONTACTO }),
  );
  return { mes, hoy: dia, clientes };
}
