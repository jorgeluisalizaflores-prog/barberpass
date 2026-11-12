// Lógica pura de la tarjeta de sellos (sin base de datos, fácil de probar).

export type EstadoTarjeta = {
  /** Sellos que se dibujan llenos en la tarjeta actual. */
  sellosVisibles: number;
  sellosRequeridos: number;
  /** Recompensas listas para canjear. */
  recompensas: number;
  /** Cortes que faltan para la próxima recompensa. */
  faltan: number;
  mensaje: string;
};

export function calcularTarjeta(sellos: number, requeridos: number, recompensa = "corte gratis"): EstadoTarjeta {
  const n = Math.max(2, requeridos);
  const total = Math.max(0, sellos);
  const recompensas = Math.floor(total / n);
  const resto = total % n;
  // Con la tarjeta recién completada se muestra llena (no vacía).
  const sellosVisibles = recompensas > 0 && resto === 0 ? n : resto;
  const faltan = n - resto;
  const premio = recompensa.trim().toLowerCase() || "corte gratis";

  let mensaje: string;
  if (recompensas > 1) mensaje = `¡Tienes ${recompensas} recompensas disponibles! Pide tu ${premio} en tu próxima visita.`;
  else if (recompensas === 1) mensaje = `¡Felicidades! Ya ganaste tu ${premio}. Canjéalo en tu próxima visita.`;
  else if (faltan === 1) mensaje = `¡Te falta 1 corte para tu ${premio}!`;
  else if (total === 0) mensaje = `Junta ${n} sellos y gana tu ${premio}.`;
  else mensaje = `¡Vas muy bien! Te faltan ${faltan} cortes para tu ${premio}.`;

  return { sellosVisibles, sellosRequeridos: n, recompensas, faltan, mensaje };
}
