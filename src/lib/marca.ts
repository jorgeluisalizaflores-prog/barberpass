// Utilidades de marca: colores que vienen de la base de datos de cada barbería.
import type { CSSProperties } from "react";

/** Elige texto blanco o negro según la luminancia del fondo (contraste legible). */
export function colorSobre(hex: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const canal = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const l = 0.2126 * canal((n >> 16) & 255) + 0.7152 * canal((n >> 8) & 255) + 0.0722 * canal(n & 255);
  return l > 0.45 ? "#111827" : "#ffffff";
}

/** Variables CSS con la marca de la barbería, para poner en un contenedor. */
export function estiloMarca(b: { colorPrimary: string; colorAccent: string }): CSSProperties {
  return {
    "--marca": b.colorPrimary,
    "--sobre-marca": colorSobre(b.colorPrimary),
    "--acento": b.colorAccent,
    "--sobre-acento": colorSobre(b.colorAccent),
  } as CSSProperties;
}
