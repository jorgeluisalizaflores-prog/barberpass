// Tipos y utilidades comunes de las acciones del servidor (Server Actions).
import { z } from "zod";
import { ErrorNegocio } from "./servicios/errores";
import { primerError } from "./validacion/esquemas";

/** Estado que devuelve una acción a su formulario. */
export type EstadoForm = { error?: string; ok?: string; datos?: Record<string, string> };

export const ESTADO_INICIAL: EstadoForm = {};

/** Convierte un error en un mensaje para el usuario; relanza los inesperados. */
export function aEstado(e: unknown): EstadoForm {
  if (e instanceof ErrorNegocio) return { error: e.message };
  if (e instanceof z.ZodError) return { error: primerError(e) };
  throw e;
}

export function texto(fd: FormData, campo: string): string {
  const v = fd.get(campo);
  return typeof v === "string" ? v.trim() : "";
}
