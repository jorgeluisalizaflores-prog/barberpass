import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { LogoPlataforma } from "@/components/logo-plataforma";
import { Campo, Tarjeta } from "@/components/ui";
import { solicitarRecuperacionAccion } from "../acciones-publicas";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperarClave() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center"><LogoPlataforma /></div>
      <Tarjeta>
        <h1 className="text-xl font-bold">¿Olvidaste tu contraseña?</h1>
        <p className="mb-4 mt-1 text-sm text-slate-600">Escribe el correo de tu cuenta y te enviaremos un enlace para crear una nueva.</p>
        <Formulario accion={solicitarRecuperacionAccion} reiniciarAlExito>
          <Campo etiqueta="Correo" name="email" type="email" required autoComplete="email" />
          <BotonEnviar tamano="lg" className="w-full">Enviar enlace</BotonEnviar>
        </Formulario>
      </Tarjeta>
      <p className="mt-4 text-center text-sm"><Link href="/ingresar" className="underline">Volver a ingresar</Link></p>
    </main>
  );
}
