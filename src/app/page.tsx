import { LogoPlataforma } from "@/components/logo-plataforma";
import { EnlaceBoton } from "@/components/ui";

export default function Inicio() {
  return (
    <main className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <LogoPlataforma />
      <p className="text-slate-600">Tarjetas de fidelidad digitales para barberías.</p>
      <EnlaceBoton href="/ingresar">Ingresar</EnlaceBoton>
    </main>
  );
}
