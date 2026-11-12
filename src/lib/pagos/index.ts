// Punto de extensión para la fase 2 (cobro automático con Culqi, Mercado Pago,
// Niubiz, etc.). Hoy solo existe el proveedor "manual": el super administrador
// registra el pago recibido por Yape, Plin o transferencia.
//
// Una pasarela implementaría esta interfaz y, al confirmar el cobro (webhook),
// llamaría al mismo servicio registrarPago() que usa el panel.
export interface ProveedorDePago {
  id: string;
  /** Crea el cobro o la suscripción y devuelve la URL de pago. */
  crearCobro(datos: { barbershopId: string; planId: string; meses: number; montoSoles: number }): Promise<{ url: string; referencia: string }>;
  /** Valida y traduce el webhook de la pasarela. */
  procesarWebhook(cuerpo: string, firma: string | null): Promise<{ referencia: string; pagado: boolean } | null>;
}

export const PROVEEDOR_MANUAL = "manual";
