import { LogoBarberia } from "@/components/marca-barberia";
import { Alerta } from "@/components/ui";
import { requerirBarberia } from "@/lib/auth/guardas";

export default async function PaginaBarberoBloqueado({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirBarberia(slug);
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <LogoBarberia barberia={barberia} tamano={64} />
      <h1 className="text-xl font-bold">{barberia.name}</h1>
      <Alerta tono="aviso">
        El panel está temporalmente bloqueado porque la suscripción de la barbería venció. Avísale al dueño para que la renueve.
        Las tarjetas de los clientes siguen visibles y no se perdió ningún dato.
      </Alerta>
    </main>
  );
}
