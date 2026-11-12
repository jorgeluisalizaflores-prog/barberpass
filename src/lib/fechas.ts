// Utilidades de fecha. Toda la lógica "por día" usa la hora de Lima (UTC-5, sin
// horario de verano), sin importar dónde corra el servidor.
import { ZONA_HORARIA } from "./config";

export const MS_DIA = 24 * 60 * 60 * 1000;
const DESFASE_LIMA_MS = 5 * 60 * 60 * 1000;

/** Fecha local de Lima como AAAA-MM-DD. */
export function fechaLocalLima(fecha: Date = new Date()): string {
  return new Date(fecha.getTime() - DESFASE_LIMA_MS).toISOString().slice(0, 10);
}

/** Día y mes actuales en Lima. */
export function diaMesLima(fecha: Date = new Date()): { dia: number; mes: number; anio: number } {
  const [anio, mes, dia] = fechaLocalLima(fecha).split("-").map(Number);
  return { dia, mes, anio };
}

/** Instante UTC en el que empieza el día (00:00 de Lima) de la fecha local dada. */
export function inicioDiaLima(fechaLocal: string): Date {
  return new Date(new Date(`${fechaLocal}T00:00:00.000Z`).getTime() + DESFASE_LIMA_MS);
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * MS_DIA);
}

/** Suma meses de calendario (31 ene + 1 mes = 28/29 feb). */
export function sumarMeses(fecha: Date, meses: number): Date {
  const r = new Date(fecha.getTime());
  const dia = r.getUTCDate();
  r.setUTCDate(1);
  r.setUTCMonth(r.getUTCMonth() + meses);
  const ultimo = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(dia, ultimo));
  return r;
}

export function formatoFecha(fecha: Date | null | undefined): string {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_HORARIA, day: "2-digit", month: "short", year: "numeric" }).format(fecha);
}

export function formatoFechaHora(fecha: Date | null | undefined): string {
  if (!fecha) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA_HORARIA, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(fecha);
}

export function formatoSoles(monto: number | string | { toString(): string }): string {
  const n = typeof monto === "number" ? monto : Number(monto.toString());
  return `S/ ${n.toLocaleString("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
