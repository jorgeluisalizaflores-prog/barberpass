import "server-only";
import { headers } from "next/headers";

/**
 * URL pública base. Usa APP_URL si está definida; si no, la deduce de la
 * petición (útil en vistas previas de Vercel y en desarrollo con el celular).
 */
export async function urlBasePublica(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
