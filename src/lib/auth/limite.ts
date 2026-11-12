// Límite de intentos fallidos para frenar ataques de fuerza bruta en los
// inicios de sesión y en los PINs. Se guarda en PostgreSQL (sin Redis).
import { LIMITE_INTENTOS } from "../config";
import { infraestructura } from "../db";

function desde(minutos: number): Date {
  return new Date(Date.now() - minutos * 60_000);
}

export type ResultadoLimite = { bloqueado: boolean; minutosRestantes: number };

/** ¿La clave (cuenta o IP) superó el máximo de fallos en la ventana? */
export async function comprobarLimite(clave: string, maximo: number = LIMITE_INTENTOS.maxPorCuenta): Promise<ResultadoLimite> {
  const intentos = await infraestructura.loginAttempt.findMany({
    where: { key: clave, createdAt: { gte: desde(LIMITE_INTENTOS.ventanaMinutos) } },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
    take: maximo + 1,
  });
  if (intentos.length < maximo) return { bloqueado: false, minutosRestantes: 0 };
  const libera = intentos[0].createdAt.getTime() + LIMITE_INTENTOS.ventanaMinutos * 60_000;
  return { bloqueado: true, minutosRestantes: Math.max(1, Math.ceil((libera - Date.now()) / 60_000)) };
}

export async function registrarFallo(...claves: string[]): Promise<void> {
  await infraestructura.loginAttempt.createMany({ data: claves.map((key) => ({ key })) });
  // Limpieza oportunista de registros viejos.
  if (Math.random() < 0.02) {
    await infraestructura.loginAttempt.deleteMany({ where: { createdAt: { lt: desde(24 * 60) } } });
  }
}

export async function limpiarFallos(clave: string): Promise<void> {
  await infraestructura.loginAttempt.deleteMany({ where: { key: clave } });
}

export function mensajeBloqueo(r: ResultadoLimite): string {
  return `Demasiados intentos fallidos. Vuelve a intentarlo en ${r.minutosRestantes} minuto${r.minutosRestantes === 1 ? "" : "s"}.`;
}
