// Proxy (antes "middleware") de Next.js.
//
// FASE 2 — subdominio por barbería: si se define ROOT_DOMAIN (p. ej.
// "barberpass.pe"), una visita a "el-bigote.barberpass.pe/registro" se
// reescribe internamente a "/el-bigote/registro". Las páginas no cambian.
// Sin ROOT_DOMAIN este proxy no hace nada.
import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const dominio = process.env.ROOT_DOMAIN;
  if (!dominio) return NextResponse.next();

  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (!host.endsWith(`.${dominio}`)) return NextResponse.next();

  const sub = host.slice(0, -dominio.length - 1);
  if (!sub || sub === "www" || sub.includes(".")) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (!url.pathname.startsWith(`/${sub}/`) && url.pathname !== `/${sub}`) {
    url.pathname = `/${sub}${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico|sw.js|iconos/).*)"],
};
