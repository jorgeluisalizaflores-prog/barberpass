// Landing page: vende el servicio a las barberías.
import Link from "next/link";
import { Sellos } from "@/components/sellos";
import { CabeceraSitio, PieSitio } from "@/components/sitio";
import { claseBoton, EnlaceBoton } from "@/components/ui";
import { NOMBRE_PLATAFORMA } from "@/lib/config";
import { conPlataforma } from "@/lib/db";
import { obtenerConfigPlataforma } from "@/lib/tenancy/resolver";
import { enlaceWhatsapp } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

const BENEFICIOS = [
  { icono: "🔁", titulo: "Clientes que vuelven", texto: "La tarjeta de sellos les da un motivo para regresar a tu barbería y no a la de la esquina." },
  { icono: "📱", titulo: "Sin app ni cartones", texto: "Tu cliente escanea un QR y tiene su tarjeta en el celular. No se pierde, no se moja, no se falsifica." },
  { icono: "⚡", titulo: "Un sello en 5 segundos", texto: "El barbero escanea el QR del cliente y toca un botón. Así de rápido, entre corte y corte." },
  { icono: "💬", titulo: "Recupera clientes por WhatsApp", texto: "Mira quién no viene hace más de 30 días y escríbele con un mensaje ya redactado." },
  { icono: "🎂", titulo: "Cumpleaños del mes", texto: "Saluda a tus clientes en su cumpleaños y dales una razón más para visitarte." },
  { icono: "📊", titulo: "Números claros", texto: "Cortes por semana, por barbero, clientes activos y recompensas canjeadas, todo en un panel." },
];

const PASOS = [
  { n: 1, titulo: "Crea tu cuenta", texto: "Pon el nombre, logo y colores de tu barbería, y define tu recompensa. Te toma menos de 10 minutos." },
  { n: 2, titulo: "Pon el QR en el mostrador", texto: "Imprime el cartel que generamos para ti. Tus clientes lo escanean y se registran solos." },
  { n: 3, titulo: "Suma sellos en cada corte", texto: "El barbero escanea la tarjeta del cliente y suma el sello. Al completar la tarjeta, el corte es gratis." },
];

export default async function Landing() {
  const [planes, cfg] = await Promise.all([
    conPlataforma((db) => db.plan.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }] })),
    obtenerConfigPlataforma(),
  ]);
  const demo = await conPlataforma((db) => db.barbershop.findFirst({ where: { isDemo: true }, select: { slug: true } }));
  const whatsapp = cfg.contactWhatsapp ? enlaceWhatsapp(cfg.contactWhatsapp, `Hola, quiero información sobre ${NOMBRE_PLATAFORMA} para mi barbería.`) : null;
  const destacado = planes.length >= 3 ? planes[1].id : null;

  const FAQ = [
    { p: "¿Mis clientes tienen que descargar una app?", r: "No. Escanean el QR de tu mostrador, llenan su nombre y celular, y su tarjeta se abre en el navegador. Pueden agregarla a la pantalla de inicio como si fuera una app." },
    { p: "¿Qué necesito para empezar?", r: "Solo un celular con cámara para los barberos y el cartel con el QR impreso. No necesitas computadora, lector ni impresora especial." },
    { p: "¿Puedo cambiar la recompensa?", r: "Sí. Tú decides cuántos sellos se necesitan (por defecto 5) y cuál es el premio: corte gratis, barba gratis, descuento, lo que prefieras." },
    { p: "¿Cómo evito que un barbero regale sellos?", r: "Cada barbero entra con su propio PIN, solo se permite un sello por cliente al día y cada sello queda registrado con fecha, hora y barbero." },
    { p: `¿Qué pasa cuando termina la prueba de ${cfg.trialDays} días?`, r: `Eliges un plan y pagas por Yape, Plin o transferencia. Si no continúas, no se borra nada: tus clientes siguen viendo su tarjeta y puedes reactivar tu cuenta cuando quieras.` },
    { p: "¿Los datos de mis clientes están seguros?", r: "Sí. Cada barbería tiene sus datos totalmente separados de las demás, y el registro cumple con la Ley N.° 29733 de Protección de Datos Personales: el cliente acepta la política de privacidad y decide si quiere recibir mensajes." },
    { p: "¿Tengo varias sedes?", r: "Cada local se registra como una barbería independiente, con su propio QR, barberos y clientes. Escríbenos y te ayudamos a configurarlas." },
  ];

  return (
    <>
      <CabeceraSitio />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-slate-950 text-white">
          <div className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-14 md:grid-cols-2 md:py-20">
            <div>
              <p className="mb-3 inline-block rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">Para barberías en Perú</p>
              <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                La tarjeta de sellos digital que hace que tus clientes <span className="text-amber-400">vuelvan</span>
              </h1>
              <p className="mt-4 max-w-lg text-lg text-slate-300">
                Cada corte suma un sello. Al quinto, el siguiente corte es gratis. Sin cartones, sin apps y con la marca de tu barbería.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <EnlaceBoton href="/registro" variante="acento" tamano="lg">Prueba gratis {cfg.trialDays} días</EnlaceBoton>
                {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={claseBoton({ variante: "whatsapp", tamano: "lg" })}>Contáctanos por WhatsApp</a>}
              </div>
              <p className="mt-3 text-sm text-slate-400">Sin tarjeta de crédito. Listo en menos de 10 minutos.{demo && <> <Link href="/demo" className="text-amber-300 underline">Ver una barbería de ejemplo</Link></>}</p>
            </div>

            {/* Maqueta de la tarjeta */}
            <div className="mx-auto w-full max-w-xs rounded-[2.2rem] border-4 border-slate-700 bg-slate-100 p-3 shadow-2xl" aria-hidden="true">
              <div className="rounded-t-3xl bg-slate-900 px-4 pb-10 pt-5 text-white">
                <div className="text-base font-extrabold">Barbería El Bigote</div>
                <div className="text-xs opacity-70">Tarjeta de Luis</div>
              </div>
              <div className="-mt-6 space-y-3 px-2 pb-2">
                <div className="rounded-2xl bg-white p-4 text-slate-900 shadow">
                  <Sellos llenos={4} total={5} icono="TIJERA" />
                  <p className="mt-3 text-center text-sm font-semibold">¡Te falta 1 corte para tu corte gratis!</p>
                </div>
                <div className="rounded-2xl bg-white p-3 text-center text-xs text-slate-500 shadow">Muestra tu QR al barbero para sumar tu sello</div>
              </div>
            </div>
          </div>
        </section>

        {/* Beneficios */}
        <section id="beneficios" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-center text-3xl font-extrabold">Más visitas, menos trabajo</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Todo lo que necesitas para fidelizar a tus clientes, pensado para el ritmo de una barbería.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {BENEFICIOS.map((b) => (
              <div key={b.titulo} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-3xl" aria-hidden="true">{b.icono}</div>
                <h3 className="mt-3 text-lg font-bold">{b.titulo}</h3>
                <p className="mt-1 text-sm text-slate-600">{b.texto}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Cómo funciona */}
        <section id="como-funciona" className="scroll-mt-16 bg-white py-16">
          <div className="mx-auto w-full max-w-6xl px-4">
            <h2 className="text-center text-3xl font-extrabold">Cómo funciona</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {PASOS.map((p) => (
                <li key={p.n} className="rounded-2xl bg-slate-50 p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-amber-400 text-lg font-black text-slate-900">{p.n}</span>
                  <h3 className="mt-4 text-lg font-bold">{p.titulo}</h3>
                  <p className="mt-1 text-sm text-slate-600">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Precios */}
        <section id="precios" className="mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-16">
          <h2 className="text-center text-3xl font-extrabold">Precios simples, en soles</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-slate-600">Empieza con {cfg.trialDays} días gratis. Paga mes a mes por Yape, Plin o transferencia. Sin contratos.</p>
          <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
            {planes.map((p) => (
              <div key={p.id} className={`flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${p.id === destacado ? "border-amber-400 ring-2 ring-amber-400" : "border-slate-200"}`}>
                {p.id === destacado && <span className="mb-2 self-start rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-bold text-slate-900">Más elegido</span>}
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="mt-1 min-h-10 text-sm text-slate-600">{p.description}</p>
                <p className="mt-4"><span className="text-4xl font-black">S/ {Number(p.priceMonthly).toFixed(0)}</span><span className="text-slate-500"> / mes</span></p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
                  <li>✓ {p.maxBarbers == null ? "Barberos ilimitados" : `Hasta ${p.maxBarbers} barbero${p.maxBarbers === 1 ? "" : "s"}`}</li>
                  <li>✓ {p.maxCustomers == null ? "Clientes ilimitados" : `Hasta ${p.maxCustomers.toLocaleString("es-PE")} clientes`}</li>
                  <li>✓ Tarjeta digital con tu marca</li>
                  <li>✓ Recuperación de clientes y cumpleaños</li>
                  <li>✓ Métricas y exportación a CSV</li>
                </ul>
                <EnlaceBoton href={`/registro?plan=${p.id}`} variante={p.id === destacado ? "acento" : "secundario"} tamano="lg" className="mt-6 w-full">Empezar gratis</EnlaceBoton>
              </div>
            ))}
          </div>
        </section>

        {/* Preguntas frecuentes */}
        <section id="preguntas" className="scroll-mt-16 bg-white py-16">
          <div className="mx-auto w-full max-w-3xl px-4">
            <h2 className="text-center text-3xl font-extrabold">Preguntas frecuentes</h2>
            <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200">
              {FAQ.map((f) => (
                <details key={f.p} className="group p-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                    {f.p}<span className="text-slate-400 transition group-open:rotate-45" aria-hidden="true">＋</span>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600">{f.r}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Cierre */}
        <section className="bg-slate-950 py-16 text-center text-white">
          <div className="mx-auto max-w-2xl px-4">
            <h2 className="text-3xl font-extrabold">Empieza hoy: tu primer cliente fiel está a un corte</h2>
            <p className="mt-2 text-slate-300">Crea tu cuenta, imprime tu QR y empieza a sumar sellos esta misma tarde.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <EnlaceBoton href="/registro" variante="acento" tamano="lg">Prueba gratis {cfg.trialDays} días</EnlaceBoton>
              {whatsapp && <a href={whatsapp} target="_blank" rel="noopener noreferrer" className={claseBoton({ variante: "whatsapp", tamano: "lg" })}>Contáctanos por WhatsApp</a>}
            </div>
          </div>
        </section>
      </main>
      <PieSitio />
    </>
  );
}
