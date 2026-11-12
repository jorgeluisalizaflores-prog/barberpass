import type { Metadata } from "next";
import { LogoBarberia } from "@/components/marca-barberia";
import { Alerta, Tarjeta } from "@/components/ui";
import { requerirBarberia } from "@/lib/auth/guardas";
import { registrarClienteAccion } from "./acciones";
import { FormularioRegistro } from "./formulario-registro";

export const metadata: Metadata = { title: "Tu tarjeta de fidelidad" };

export default async function PaginaRegistro({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, suscripcion } = await requerirBarberia(slug);
  const premio = barberia.rewardText.toLowerCase();

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-marca px-4 pb-10 pt-8 text-center text-sobre-marca">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <LogoBarberia barberia={barberia} tamano={80} />
          <h1 className="text-2xl font-extrabold">{barberia.name}</h1>
          <p className="text-base opacity-90">
            Junta {barberia.stampsRequired} sellos y gana tu <strong>{premio}</strong>.
            {barberia.welcomeStampEnabled && barberia.welcomeStamps > 0 && (
              <> Regístrate hoy y empieza con {barberia.welcomeStamps} sello{barberia.welcomeStamps === 1 ? "" : "s"} de regalo.</>
            )}
          </p>
        </div>
      </header>
      <div className="mx-auto -mt-6 w-full max-w-md flex-1 px-4 pb-10">
        <Tarjeta>
          {suscripcion.bloqueada ? (
            <Alerta tono="aviso">El registro de nuevos clientes no está disponible por el momento. Consulta en la barbería.</Alerta>
          ) : (
            <FormularioRegistro slug={slug} nombreBarberia={barberia.name} accion={registrarClienteAccion.bind(null, slug)} />
          )}
        </Tarjeta>
      </div>
    </main>
  );
}
