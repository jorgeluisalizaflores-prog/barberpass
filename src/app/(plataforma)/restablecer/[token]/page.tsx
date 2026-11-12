import type { Metadata } from "next";
import Link from "next/link";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { LogoPlataforma } from "@/components/logo-plataforma";
import { Alerta, Campo, Tarjeta } from "@/components/ui";
import { tokenRecuperacionValido } from "@/lib/servicios/recuperacion";
import { restablecerAccion } from "../../acciones-publicas";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false }, referrer: "no-referrer" };

export default async function PaginaRestablecer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const valido = await tokenRecuperacionValido(token);
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center"><LogoPlataforma /></div>
      <Tarjeta>
        <h1 className="mb-4 text-xl font-bold">Crea tu nueva contraseña</h1>
        {valido ? (
          <Formulario accion={restablecerAccion.bind(null, token)}>
            <Campo etiqueta="Nueva contraseña" name="password" type="password" required minLength={8} autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
            <Campo etiqueta="Repite la contraseña" name="password2" type="password" required minLength={8} autoComplete="new-password" />
            <BotonEnviar tamano="lg" className="w-full">Guardar contraseña</BotonEnviar>
          </Formulario>
        ) : (
          <Alerta tono="aviso">Este enlace ya no es válido (venció o ya se usó). <Link href="/recuperar-clave" className="font-semibold underline">Solicita uno nuevo</Link>.</Alerta>
        )}
      </Tarjeta>
    </main>
  );
}
