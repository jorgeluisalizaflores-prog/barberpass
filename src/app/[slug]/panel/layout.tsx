import type { Metadata } from "next";
import Link from "next/link";
import { LogoBarberia } from "@/components/marca-barberia";
import { Nav } from "@/components/nav";
import { contextoDueno } from "@/lib/auth/guardas";
import { formatoFecha } from "@/lib/fechas";
import { salirDueno } from "@/app/(plataforma)/ingresar/acciones";

export const metadata: Metadata = { robots: { index: false } };

export default async function LayoutPanel({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, suscripcion, impersonando, nombreUsuario } = await contextoDueno(slug);
  const base = `/${slug}/panel`;
  const items = [
    { href: base, etiqueta: "Resumen", exacto: true },
    { href: `${base}/clientes`, etiqueta: "Clientes" },
    { href: `${base}/recuperar`, etiqueta: "Recuperar" },
    { href: `${base}/cumpleanos`, etiqueta: "Cumpleaños" },
    { href: `${base}/barberos`, etiqueta: "Barberos" },
    { href: `${base}/marca`, etiqueta: "Marca y recompensa" },
    { href: `${base}/cartel`, etiqueta: "Cartel QR" },
    { href: `${base}/suscripcion`, etiqueta: "Suscripción" },
  ];
  const bloqueado = suscripcion.bloqueada && !impersonando;

  return (
    <div className="flex flex-1 flex-col">
      {impersonando && (
        <div className="no-imprimir bg-fuchsia-700 px-4 py-2 text-center text-sm font-medium text-white">
          Modo soporte: estás viendo el panel de {barberia.name} como super administrador. Todo queda registrado en auditoría.{" "}
          <Link href="/admin/barberias" className="underline">Volver a administración</Link>
        </div>
      )}
      <header className="no-imprimir border-b border-slate-200 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <Link href={base} className="flex items-center gap-2 font-bold">
              <LogoBarberia barberia={barberia} tamano={36} />
              <span>{barberia.name}</span>
            </Link>
            <form action={salirDueno} className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-500 sm:inline">{nombreUsuario}</span>
              <button className="rounded-lg px-2 py-1 text-slate-600 underline">Salir</button>
            </form>
          </div>
          {!bloqueado && <Nav items={items} />}
        </div>
      </header>

      {/* Avisos de suscripción */}
      {!bloqueado && suscripcion.estado === "EN_GRACIA" && (
        <div className="no-imprimir bg-red-600 px-4 py-2 text-center text-sm font-medium text-white">
          Tu suscripción venció el {formatoFecha(suscripcion.venceEl)}. Tienes hasta el {formatoFecha(suscripcion.finGracia)} para renovar antes de que el panel se bloquee.{" "}
          <Link href={`${base}/suscripcion`} className="underline">Renovar</Link>
        </div>
      )}
      {!bloqueado && suscripcion.porVencer && (
        <div className="no-imprimir bg-amber-400 px-4 py-2 text-center text-sm font-medium text-slate-900">
          {suscripcion.estado === "PRUEBA" ? "Tu prueba gratis" : "Tu suscripción"} vence
          {suscripcion.diasRestantes! <= 1 ? " mañana o antes" : ` en ${suscripcion.diasRestantes} días`} ({formatoFecha(suscripcion.venceEl)}).{" "}
          <Link href={`${base}/suscripcion`} className="underline">Ver cómo renovar</Link>
        </div>
      )}

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
