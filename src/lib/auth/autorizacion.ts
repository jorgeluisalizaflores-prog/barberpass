// Regla central de autorización por barbería (función pura, cubierta por las
// pruebas de aislamiento): una sesión solo vale para SU barbería.
import type { SessionRole } from "@prisma/client";

export type SesionMinima = {
  role: SessionRole;
  barbershopId: string | null;
  expiresAt: Date;
};

export function sesionAutorizaBarberia(
  sesion: SesionMinima | null,
  barbershopId: string,
  rol: "DUENO" | "BARBERO",
  ahora: Date = new Date(),
): boolean {
  if (!sesion) return false;
  if (sesion.role !== rol) return false;
  if (sesion.expiresAt.getTime() < ahora.getTime()) return false;
  return sesion.barbershopId === barbershopId;
}
