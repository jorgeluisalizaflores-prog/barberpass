import type { Metadata } from "next";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { LogoPlataforma } from "@/components/logo-plataforma";
import { Campo, Tarjeta } from "@/components/ui";
import { ingresarSuperAdmin } from "../acciones-sesion";

export const metadata: Metadata = { title: "Administración", robots: { index: false } };

export default function PaginaIngresarAdmin() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center"><LogoPlataforma /></div>
      <Tarjeta>
        <h1 className="mb-4 text-xl font-bold">Administración de la plataforma</h1>
        <Formulario accion={ingresarSuperAdmin}>
          <Campo etiqueta="Correo" name="email" type="email" autoComplete="email" required />
          <Campo etiqueta="Contraseña" name="password" type="password" autoComplete="current-password" required />
          <BotonEnviar tamano="lg" className="w-full" textoEnviando="Ingresando…">Ingresar</BotonEnviar>
        </Formulario>
      </Tarjeta>
    </main>
  );
}
