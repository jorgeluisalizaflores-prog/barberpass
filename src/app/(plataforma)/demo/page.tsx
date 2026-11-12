// Página pública para mostrar la plataforma con la barbería demo.
import type { Metadata } from "next";
import { CabeceraSitio, PieSitio } from "@/components/sitio";
import { EnlaceBoton, Tarjeta, Vacio } from "@/components/ui";
import { DEMO, obtenerDemo } from "@/lib/servicios/demo";

export const metadata: Metadata = { title: "Demo" };
export const dynamic = "force-dynamic";

export default async function PaginaDemo() {
  const demo = await obtenerDemo();
  return (
    <>
      <CabeceraSitio />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <h1 className="text-3xl font-extrabold">Mira cómo funciona con una barbería de ejemplo</h1>
        <p className="mt-2 text-slate-600">«{DEMO.nombre}» es una barbería ficticia con clientes y cortes de muestra. Ábrela en tu celular para vivirla como tus clientes.</p>
        {!demo ? (
          <div className="mt-8"><Vacio>La demostración no está disponible en este momento.</Vacio></div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            <Tarjeta className="flex flex-col">
              <div className="text-3xl" aria-hidden="true">💳</div>
              <h2 className="mt-2 text-lg font-bold">La tarjeta del cliente</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">Luis ya tiene 4 de 5 sellos: le falta un corte para el gratis. Así la ve en su celular.</p>
              {demo.cardToken && <EnlaceBoton href={`/${demo.slug}/tarjeta/${demo.cardToken}`} className="mt-4">Ver tarjeta</EnlaceBoton>}
            </Tarjeta>
            <Tarjeta className="flex flex-col">
              <div className="text-3xl" aria-hidden="true">📝</div>
              <h2 className="mt-2 text-lg font-bold">El registro por QR</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">Lo que ve un cliente nuevo al escanear el cartel del mostrador. Regístrate y obtén tu propia tarjeta de prueba.</p>
              <EnlaceBoton href={`/${demo.slug}/registro`} variante="secundario" className="mt-4">Probar el registro</EnlaceBoton>
            </Tarjeta>
            <Tarjeta className="flex flex-col">
              <div className="text-3xl" aria-hidden="true">✂️</div>
              <h2 className="mt-2 text-lg font-bold">El panel del barbero</h2>
              <p className="mt-1 flex-1 text-sm text-slate-600">Elige un barbero e ingresa con el PIN <strong>{DEMO.pinBarberos}</strong>. Busca a «Luis» y súmale su sello.</p>
              <EnlaceBoton href={`/${demo.slug}/barbero`} variante="secundario" className="mt-4">Abrir panel del barbero</EnlaceBoton>
            </Tarjeta>
          </div>
        )}
        <div className="mt-10 rounded-2xl bg-slate-900 p-8 text-center text-white">
          <h2 className="text-2xl font-extrabold">¿Te gustó? Tenlo en tu barbería hoy</h2>
          <p className="mt-1 text-slate-300">También podemos mostrarte el panel del dueño con métricas y clientes en una videollamada.</p>
          <EnlaceBoton href="/registro" variante="acento" tamano="lg" className="mt-5">Empezar mi prueba gratis</EnlaceBoton>
        </div>
      </main>
      <PieSitio />
    </>
  );
}
