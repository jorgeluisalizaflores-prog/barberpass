// Tarjeta de fidelidad del cliente. Es pública pero su URL lleva un token
// aleatorio de 128 bits: no usa IDs secuenciales ni se puede adivinar.
// Siempre es de solo lectura, y sigue visible aunque la barbería esté vencida.
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LogoBarberia } from "@/components/marca-barberia";
import { Sellos } from "@/components/sellos";
import { Alerta } from "@/components/ui";
import { requerirBarberia } from "@/lib/auth/guardas";
import { formatoFechaHora } from "@/lib/fechas";
import { calcularTarjeta } from "@/lib/fidelidad/tarjeta";
import { qrSvg } from "@/lib/qr";
import { obtenerTarjeta } from "@/lib/servicios/clientes";
import { obtenerBarberiaPorSlug } from "@/lib/tenancy/resolver";
import { urlBasePublica } from "@/lib/url";
import { TarjetaEnVivo } from "./en-vivo";

type Props = { params: Promise<{ slug: string; token: string }>; searchParams: Promise<{ bienvenida?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, token } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia) return {};
  return {
    title: "Mi tarjeta",
    manifest: `/${slug}/tarjeta/${token}/manifest.webmanifest`,
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: barberia.name, statusBarStyle: "default" },
    icons: { icon: `/${slug}/icono/192?v=${barberia.logoVersion}`, apple: `/${slug}/icono/180?v=${barberia.logoVersion}` },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const { slug } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  return { themeColor: barberia?.colorPrimary ?? "#111827" };
}

const ETIQUETA_MOVIMIENTO = { CORTE: "Corte", BIENVENIDA: "Sello de bienvenida", EXTRA_AUTORIZADO: "Corte (sello extra)", CANJE: "Recompensa canjeada" } as const;

export default async function PaginaTarjeta({ params, searchParams }: Props) {
  const { slug, token } = await params;
  const { bienvenida } = await searchParams;
  const { barberia } = await requerirBarberia(slug);
  const tarjeta = await obtenerTarjeta(barberia.id, token);
  if (!tarjeta) notFound();

  const { cliente, historial } = tarjeta;
  const estado = calcularTarjeta(cliente.stampsCount, barberia.stampsRequired, barberia.rewardText);
  const qr = await qrSvg(`${await urlBasePublica()}/${slug}/q/${cliente.qrToken}`);
  const primerNombre = cliente.name.split(" ")[0];

  return (
    <main className="flex flex-1 flex-col bg-slate-100">
      <TarjetaEnVivo />
      <header className="bg-marca px-4 pb-16 pt-6 text-sobre-marca">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <LogoBarberia barberia={barberia} tamano={52} />
          <div className="min-w-0">
            <div className="truncate text-lg font-extrabold">{barberia.name}</div>
            <div className="text-sm opacity-80">Tarjeta de {primerNombre}</div>
          </div>
        </div>
      </header>

      <div className="mx-auto -mt-12 w-full max-w-md flex-1 space-y-4 px-4 pb-10">
        {bienvenida && (
          <Alerta tono="ok">
            <strong>¡Listo, {primerNombre}!</strong> Esta es tu tarjeta. Guárdala: en el menú de tu navegador elige
            «Agregar a pantalla de inicio» para tenerla siempre a la mano.
          </Alerta>
        )}

        {/* Tarjeta de sellos */}
        <section className="rounded-3xl bg-white p-5 shadow-lg">
          {estado.recompensas > 0 && (
            <div className="mb-4 rounded-2xl bg-acento px-4 py-3 text-center text-sobre-acento">
              <div className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {estado.recompensas === 1 ? "Tienes 1 recompensa disponible" : `Tienes ${estado.recompensas} recompensas disponibles`}
              </div>
              <div className="text-xl font-extrabold">🎉 {barberia.rewardText}</div>
            </div>
          )}
          <Sellos llenos={estado.sellosVisibles} total={estado.sellosRequeridos} icono={barberia.stampIcon} />
          <p className="mt-4 text-center text-base font-semibold text-slate-800">{estado.mensaje}</p>
          <p className="mt-1 text-center text-xs text-slate-500">
            {estado.sellosVisibles} de {estado.sellosRequeridos} sellos · {cliente.totalRedemptions} recompensa{cliente.totalRedemptions === 1 ? "" : "s"} canjeada{cliente.totalRedemptions === 1 ? "" : "s"}
          </p>
        </section>

        {/* QR del cliente */}
        <section className="rounded-3xl bg-white p-5 text-center shadow">
          <h2 className="text-sm font-semibold text-slate-700">Muestra este código a tu barbero</h2>
          <div className="mx-auto mt-3 w-44 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <p className="mt-2 text-xs text-slate-500">Lo escanea para sumar tu sello. Solo funciona en {barberia.name}.</p>
        </section>

        {/* Historial */}
        <section className="rounded-3xl bg-white p-5 shadow">
          <h2 className="mb-2 text-sm font-semibold text-slate-700">Historial</h2>
          {historial.length === 0 ? (
            <p className="text-sm text-slate-500">Aún no tienes visitas registradas. ¡Te esperamos!</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {historial.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium text-slate-800">
                      {m.tipo === "CANJE" ? "🎁 " : "✂️ "}{ETIQUETA_MOVIMIENTO[m.tipo]}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatoFechaHora(m.fecha)}{m.barbero ? ` · con ${m.barbero}` : ""}
                    </div>
                  </div>
                  <span className={m.tipo === "CANJE" ? "font-semibold text-emerald-700" : "font-semibold text-slate-700"}>
                    {m.tipo === "CANJE" ? "Gratis" : `+${m.cantidad}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="space-y-1 text-center text-xs text-slate-500">
          {(barberia.address || barberia.city) && <p>{[barberia.address, barberia.city].filter(Boolean).join(" · ")}</p>}
          <p><Link href={`/${slug}/privacidad`} className="underline">Política de privacidad</Link></p>
        </footer>
      </div>
    </main>
  );
}
