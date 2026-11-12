// Estado de la suscripción de una barbería. Lógica pura (sin base de datos):
// el estado "vencida" NO se guarda, se calcula por fecha, así nunca queda
// desactualizado y no hacen falta tareas programadas.
import { MS_DIA, sumarDias, sumarMeses } from "../fechas";

export type EstadoSuscripcion = "PRUEBA" | "ACTIVA" | "EN_GRACIA" | "VENCIDA" | "SUSPENDIDA";

export type DatosSuscripcion = {
  status: "PRUEBA" | "ACTIVA" | "SUSPENDIDA";
  trialEndsAt: Date;
  paidUntil: Date | null;
  isDemo: boolean;
};

export type ConfigSuscripcion = { graceDays: number; expiringNoticeDays: number };

export type ResumenSuscripcion = {
  estado: EstadoSuscripcion;
  /** Etiqueta para las listas: En prueba / Activa / Vencida / Suspendida. */
  etiqueta: string;
  venceEl: Date | null;
  /** Días que faltan para vencer (negativo si ya venció). */
  diasRestantes: number | null;
  /** Vence dentro de los próximos N días: mostrar aviso. */
  porVencer: boolean;
  /** Último día del período de gracia. */
  finGracia: Date | null;
  /** true → panel del dueño y de los barberos bloqueado (tarjetas en solo lectura). */
  bloqueada: boolean;
};

export function calcularSuscripcion(b: DatosSuscripcion, cfg: ConfigSuscripcion, ahora: Date = new Date()): ResumenSuscripcion {
  // La barbería demo nunca vence.
  if (b.isDemo) {
    return { estado: "ACTIVA", etiqueta: "Demo", venceEl: null, diasRestantes: null, porVencer: false, finGracia: null, bloqueada: false };
  }

  const venceEl = b.paidUntil ?? b.trialEndsAt;
  const diasRestantes = Math.ceil((venceEl.getTime() - ahora.getTime()) / MS_DIA);
  const finGracia = sumarDias(venceEl, cfg.graceDays);

  if (b.status === "SUSPENDIDA") {
    return { estado: "SUSPENDIDA", etiqueta: "Suspendida", venceEl, diasRestantes, porVencer: false, finGracia, bloqueada: true };
  }

  if (ahora.getTime() <= venceEl.getTime()) {
    const enPrueba = b.status === "PRUEBA" && !b.paidUntil;
    return {
      estado: enPrueba ? "PRUEBA" : "ACTIVA",
      etiqueta: enPrueba ? "En prueba" : "Activa",
      venceEl,
      diasRestantes,
      porVencer: diasRestantes <= cfg.expiringNoticeDays,
      finGracia,
      bloqueada: false,
    };
  }

  // Ya venció: días de gracia y luego bloqueo. Nunca se borran datos.
  const enGracia = ahora.getTime() <= finGracia.getTime();
  return {
    estado: enGracia ? "EN_GRACIA" : "VENCIDA",
    etiqueta: "Vencida",
    venceEl,
    diasRestantes,
    porVencer: false,
    finGracia,
    bloqueada: !enGracia,
  };
}

/**
 * Período que cubre un pago. Si la barbería todavía tiene días vigentes (de
 * prueba o pagados), el nuevo período empieza cuando terminan: no pierde días.
 */
export function calcularPeriodoPago(
  b: { trialEndsAt: Date; paidUntil: Date | null },
  fechaPago: Date,
  meses: number,
): { periodStart: Date; periodEnd: Date } {
  const vigente = b.paidUntil ?? b.trialEndsAt;
  const periodStart = vigente.getTime() > fechaPago.getTime() ? vigente : fechaPago;
  return { periodStart, periodEnd: sumarMeses(periodStart, meses) };
}
