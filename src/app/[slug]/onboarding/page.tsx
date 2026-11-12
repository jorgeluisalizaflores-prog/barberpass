// Asistente de alta de una barbería nueva: 5 pasos y queda lista para usarse.
import type { Metadata } from "next";
import Link from "next/link";
import { CamposColores, CamposDatos, CamposPrograma } from "@/components/campos-marca";
import { Cartel } from "@/components/cartel";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { LogoBarberia } from "@/components/marca-barberia";
import { SubirLogo } from "@/components/subir-logo";
import { Alerta, Boton, Campo, cx, EnlaceBoton, Tarjeta } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { qrPngDataUrl } from "@/lib/qr";
import { urlLogo } from "@/lib/tenancy/resolver";
import { urlBasePublica } from "@/lib/url";
import { crearBarberoAccion, logoAccion, pinDuenoAccion } from "../panel/acciones";
import { finalizarOnboardingAccion, pasoColoresAccion, pasoDatosAccion, pasoProgramaAccion } from "./acciones";

export const metadata: Metadata = { title: "Configura tu barbería", robots: { index: false } };

const PASOS = ["Tu barbería", "Logo y colores", "Recompensa", "Barberos", "Tu QR"];

export default async function PaginaOnboarding({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ paso?: string }> }) {
  const { slug } = await params;
  const paso = Math.min(5, Math.max(1, Number((await searchParams).paso) || 1));
  const { barberia: b, suscripcion } = await requerirDuenoActivo(slug);
  const base = `/${slug}/onboarding`;

  const barberos = paso === 4
    ? await conBarberia(b.id, (db) => db.barber.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { createdAt: "asc" } }))
    : [];
  const tienePin = paso === 4 ? !!(await conBarberia(b.id, (db) => db.barbershop.findFirst({ select: { ownerPinHash: true } })))?.ownerPinHash : false;
  const hayCupo = b.plan.maxBarbers == null || barberos.length < b.plan.maxBarbers;
  const urlRegistro = `${await urlBasePublica()}/${slug}/registro`;

  const Atras = () => (paso > 1 ? <EnlaceBoton href={`${base}?paso=${paso - 1}`} variante="fantasma">← Atrás</EnlaceBoton> : <span />);

  return (
    <div className="flex flex-1 flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <span className="flex items-center gap-2 font-bold"><LogoBarberia barberia={b} tamano={36} /> {b.name}</span>
          <span className="text-xs text-slate-500">{suscripcion.diasRestantes} días de prueba gratis</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        {/* Progreso */}
        <ol className="mb-6 flex gap-1.5" aria-label="Pasos">
          {PASOS.map((nombre, i) => (
            <li key={nombre} className="flex-1" aria-current={i + 1 === paso ? "step" : undefined}>
              <div className={cx("h-1.5 rounded-full", i + 1 <= paso ? "bg-marca" : "bg-slate-300")} />
              <span className={cx("mt-1 hidden text-xs sm:block", i + 1 === paso ? "font-semibold text-slate-900" : "text-slate-500")}>{i + 1}. {nombre}</span>
            </li>
          ))}
        </ol>
        <p className="mb-1 text-sm font-medium text-slate-500">Paso {paso} de 5</p>

        {paso === 1 && (
          <Tarjeta>
            <h1 className="text-2xl font-bold">Cuéntanos de tu barbería</h1>
            <p className="mb-4 mt-1 text-sm text-slate-600">Estos datos aparecen en la tarjeta de tus clientes.</p>
            <Formulario accion={pasoDatosAccion.bind(null, slug)}>
              <CamposDatos b={b} />
              <div className="flex justify-between pt-2"><Atras /><BotonEnviar tamano="lg" textoEnviando="Guardando…">Continuar</BotonEnviar></div>
            </Formulario>
          </Tarjeta>
        )}

        {paso === 2 && (
          <Tarjeta>
            <h1 className="text-2xl font-bold">Logo y colores</h1>
            <p className="mb-4 mt-1 text-sm text-slate-600">Dale a la tarjeta la cara de tu barbería. Puedes cambiarlo cuando quieras.</p>
            <div className="mb-5"><SubirLogo urlActual={urlLogo(b)} accion={logoAccion.bind(null, slug)} /></div>
            <Formulario accion={pasoColoresAccion.bind(null, slug)}>
              <CamposColores b={b} />
              <div className="flex justify-between pt-2"><Atras /><BotonEnviar tamano="lg" textoEnviando="Guardando…">Continuar</BotonEnviar></div>
            </Formulario>
          </Tarjeta>
        )}

        {paso === 3 && (
          <Tarjeta>
            <h1 className="text-2xl font-bold">Tu recompensa</h1>
            <p className="mb-4 mt-1 text-sm text-slate-600">Lo más común: 5 sellos y el siguiente corte es gratis.</p>
            <Formulario accion={pasoProgramaAccion.bind(null, slug)}>
              <CamposPrograma b={b} />
              <div className="flex justify-between pt-2"><Atras /><BotonEnviar tamano="lg" textoEnviando="Guardando…">Continuar</BotonEnviar></div>
            </Formulario>
          </Tarjeta>
        )}

        {paso === 4 && (
          <div className="space-y-4">
            <Tarjeta>
              <h1 className="text-2xl font-bold">Tus barberos</h1>
              <p className="mb-4 mt-1 text-sm text-slate-600">
                Cada barbero suma sellos con su propio PIN. Si tú también cortas, créate como barbero.
                {b.plan.maxBarbers != null && ` Tu plan ${b.plan.name} permite hasta ${b.plan.maxBarbers}.`}
              </p>
              {barberos.length > 0 && (
                <ul className="mb-4 flex flex-wrap gap-2">
                  {barberos.map((x) => <li key={x.id} className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-800">✓ {x.name}</li>)}
                </ul>
              )}
              {hayCupo ? (
                <Formulario accion={crearBarberoAccion.bind(null, slug)} reiniciarAlExito>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo etiqueta="Nombre del barbero" name="nombre" required maxLength={80} placeholder="Ej. Carlos" />
                    <Campo etiqueta="PIN (4 a 6 dígitos)" name="pin" required inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="off" />
                  </div>
                  <BotonEnviar variante="secundario" textoEnviando="Agregando…">Agregar barbero</BotonEnviar>
                </Formulario>
              ) : (
                <Alerta tono="info">Ya tienes el máximo de barberos de tu plan.</Alerta>
              )}
            </Tarjeta>
            <Tarjeta>
              <h2 className="font-bold">PIN de autorización del dueño <span className="font-normal text-slate-500">(opcional)</span></h2>
              <p className="mb-3 mt-1 text-sm text-slate-600">
                Solo se permite 1 sello por cliente al día. Con este PIN puedes autorizar un sello extra. {tienePin && "✓ Ya lo configuraste."}
              </p>
              <Formulario accion={pinDuenoAccion.bind(null, slug)} reiniciarAlExito className="flex flex-wrap items-end gap-3">
                <Campo etiqueta="PIN (4 a 6 dígitos)" name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required autoComplete="off" className="w-40" />
                <BotonEnviar variante="secundario" textoEnviando="Guardando…">Guardar PIN</BotonEnviar>
              </Formulario>
            </Tarjeta>
            <div className="flex justify-between">
              <Atras />
              <EnlaceBoton href={`${base}?paso=5`} tamano="lg">{barberos.length ? "Continuar" : "Lo haré después"}</EnlaceBoton>
            </div>
          </div>
        )}

        {paso === 5 && (
          <div className="space-y-4">
            <Tarjeta>
              <h1 className="text-2xl font-bold">¡Tu barbería está lista! 🎉</h1>
              <p className="mt-1 text-sm text-slate-600">
                Imprime este cartel y ponlo en el mostrador. Tus clientes lo escanean y obtienen su tarjeta.
                Tus barberos ingresan desde <strong className="break-all">{urlRegistro.replace(/registro$/, "barbero")}</strong>.
              </p>
            </Tarjeta>
            <Cartel
              nombre={b.name} texto={b.tagline} recompensa={b.rewardText} sellos={b.stampsRequired}
              urlRegistro={urlRegistro} qrDataUrl={await qrPngDataUrl(urlRegistro, 800)} logoUrl={urlLogo(b)} slug={slug}
            />
            <div className="no-imprimir flex justify-between">
              <Atras />
              <form action={finalizarOnboardingAccion.bind(null, slug)}><Boton type="submit" variante="acento" tamano="lg">Ir a mi panel</Boton></form>
            </div>
          </div>
        )}

        {paso < 5 && (
          <p className="mt-6 text-center text-sm">
            <Link href={`${base}?paso=5`} className="text-slate-500 underline">Omitir y configurar después</Link>
          </p>
        )}
      </main>
    </div>
  );
}
