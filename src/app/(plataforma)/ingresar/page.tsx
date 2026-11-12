import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { LogoPlataforma } from "@/components/logo-plataforma";
import { Alerta, Campo, Tarjeta } from "@/components/ui";
import { ingresarDueno } from "./acciones";

export const metadata: Metadata = { title: "Ingresar" };

export default async function PaginaIngresar({ searchParams }: { searchParams: Promise<{ siguiente?: string; clave?: string }> }) {
  const { siguiente, clave } = await searchParams;
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center"><LogoPlataforma /></div>
      <Tarjeta>
        <h1 className="text-xl font-bold">Ingresa al panel de tu barbería</h1>
        <p className="mb-4 mt-1 text-sm text-slate-600">Acceso para dueños de barbería.</p>
        {clave && <Alerta tono="ok" className="mb-4">Contraseña actualizada. Ya puedes ingresar.</Alerta>}
        <Formulario accion={ingresarDueno}>
          <input type="hidden" name="siguiente" value={siguiente ?? ""} />
          <Campo etiqueta="Correo" name="email" type="email" autoComplete="email" required />
          <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" required />
          <BotonEnviar tamano="lg" className="w-full" textoEnviando="Ingresando…">Ingresar</BotonEnviar>
        </Formulario>
        <p className="mt-3 text-center text-sm"><Link href="/recuperar-clave" className="text-slate-600 underline">¿Olvidaste tu contraseña?</Link></p>
      </Tarjeta>
      <p className="mt-4 text-center text-sm text-slate-600">
        ¿Aún no tienes cuenta? <Link href="/registro" className="font-semibold text-slate-900 underline">Prueba gratis</Link>
      </p>
      <p className="mt-2 text-center text-xs text-slate-500">¿Eres barbero? Ingresa desde el enlace de tu barbería.</p>
    </main>
  );
}
