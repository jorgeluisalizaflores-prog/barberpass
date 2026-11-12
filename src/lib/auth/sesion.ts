// Sesiones propias guardadas en base de datos. La cookie (httpOnly) lleva un
// token aleatorio; en la base solo se guarda su hash SHA-256, así que un volcado
// de la base no permite secuestrar sesiones. Cada rol usa su propia cookie.
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { SessionRole } from "@prisma/client";
import { COOKIES, DURACION_SESION_HORAS } from "../config";
import { infraestructura } from "../db";
import { sha256, tokenSeguro } from "../tokens";

export type SesionActiva = {
  id: string;
  role: SessionRole;
  superAdminId: string | null;
  ownerUserId: string | null;
  barberId: string | null;
  barbershopId: string | null;
  impersonatorId: string | null;
  expiresAt: Date;
};

type NuevaSesion = {
  role: SessionRole;
  superAdminId?: string;
  ownerUserId?: string;
  barberId?: string;
  barbershopId?: string;
  impersonatorId?: string;
  ip?: string | null;
};

export async function crearSesion(datos: NuevaSesion): Promise<void> {
  const token = tokenSeguro(32);
  const horas = datos.impersonatorId ? DURACION_SESION_HORAS.IMPERSONACION : DURACION_SESION_HORAS[datos.role];
  const expiresAt = new Date(Date.now() + horas * 3_600_000);

  await infraestructura.session.create({ data: { ...datos, tokenHash: sha256(token), expiresAt } });

  // Limpieza oportunista de sesiones vencidas.
  if (Math.random() < 0.05) await infraestructura.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });

  const jar = await cookies();
  jar.set(COOKIES[datos.role], token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Lee la sesión vigente de un rol (una sola consulta por petición). */
export const leerSesion = cache(async (role: SessionRole): Promise<SesionActiva | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIES[role])?.value;
  if (!token) return null;
  const sesion = await infraestructura.session.findUnique({ where: { tokenHash: sha256(token) } });
  if (!sesion || sesion.role !== role || sesion.expiresAt.getTime() < Date.now()) return null;
  return sesion;
});

export async function cerrarSesion(role: SessionRole): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIES[role])?.value;
  if (token) await infraestructura.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(COOKIES[role]);
}

/** Cierra todas las sesiones de un barbero (al desactivarlo o cambiarle el PIN). */
export async function revocarSesionesBarbero(barberId: string): Promise<void> {
  await infraestructura.session.deleteMany({ where: { barberId } });
}

export async function revocarSesionesDueno(ownerUserId: string): Promise<void> {
  await infraestructura.session.deleteMany({ where: { ownerUserId } });
}
