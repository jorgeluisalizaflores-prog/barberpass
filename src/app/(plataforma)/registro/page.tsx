import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { CabeceraSitio, PieSitio } from "@/components/sitio";
import { Campo, Seleccion, Tarjeta } from "@/components/ui";
import { conPlataforma } from "@/lib/db";
import { obtenerConfigPlataforma } from "@/lib/tenancy/resolver";
import { registrarBarberiaAccion } from "../acciones-publicas";

export const metadata: Metadata = { title: "Prueba gratis" };

export default async function PaginaRegistroBarberia({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan } = await searchParams;
  const cfg = await obtenerConfigPlataforma();
  const planes = await conPlataforma((db) => db.plan.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }] }));
  return (
    <>
      <CabeceraSitio />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
        <h1 className="text-3xl font-extrabold">Crea la cuenta de tu barbería</h1>
        <p className="mb-6 mt-1 text-slate-600">{cfg.trialDays} días de prueba gratis. Sin tarjeta de crédito.</p>
        <Tarjeta>
          <Formulario accion={registrarBarberiaAccion}>
            <Campo etiqueta="Nombre de tu barbería" name="nombreBarberia" required maxLength={80} placeholder="Ej. Barbería El Bigote" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Tu nombre" name="nombreDueno" required maxLength={80} autoComplete="name" />
              <Campo etiqueta="Tu celular (opcional)" name="telefono" inputMode="numeric" placeholder="9XX XXX XXX" autoComplete="tel-national" />
            </div>
            <Campo etiqueta="Correo" name="email" type="email" required autoComplete="email" ayuda="Con este correo ingresarás a tu panel." />
            <Campo etiqueta="Contraseña" name="password" type="password" required minLength={8} autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
            {planes.length > 1 && (
              <Seleccion etiqueta="Plan (puedes cambiarlo después)" name="planId" defaultValue={planes.some((p) => p.id === plan) ? plan : planes[0].id}>
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · S/ {Number(p.priceMonthly).toFixed(0)}/mes · {p.maxBarbers == null ? "barberos ilimitados" : `hasta ${p.maxBarbers} barberos`}
                  </option>
                ))}
              </Seleccion>
            )}
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input type="checkbox" name="aceptaTerminos" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400" />
              <span>Acepto los <Link href="/terminos" target="_blank" className="font-semibold underline">términos del servicio</Link> y la <Link href="/privacidad" target="_blank" className="font-semibold underline">política de privacidad</Link>.</span>
            </label>
            <BotonEnviar variante="acento" tamano="xl" textoEnviando="Creando tu barbería…">Empezar mi prueba gratis</BotonEnviar>
          </Formulario>
        </Tarjeta>
        <p className="mt-4 text-center text-sm text-slate-600">¿Ya tienes cuenta? <Link href="/ingresar" className="font-semibold underline">Ingresar</Link></p>
      </main>
      <PieSitio />
    </>
  );
}
