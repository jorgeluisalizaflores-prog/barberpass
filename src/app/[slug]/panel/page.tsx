import { GraficoBarras } from "@/components/grafico";
import { redirect } from "next/navigation";
import { EnlaceBoton, Metrica, Tabla, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { obtenerMetricas } from "@/lib/servicios/panel";

export default async function PaginaPanel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, impersonando } = await requerirDuenoActivo(slug);
  // Primera vez: el dueño pasa por el asistente de alta.
  if (!barberia.onboardingCompletedAt && !impersonando) redirect(`/${slug}/onboarding`);
  const m = await obtenerMetricas(barberia.id);

  return (
    <>
      <Titulo
        descripcion="Cómo va tu programa de fidelidad."
        acciones={<>
          <EnlaceBoton href={`/${slug}/barbero`} variante="secundario">Panel del barbero</EnlaceBoton>
          <EnlaceBoton href={`/${slug}/panel/cartel`}>Cartel QR</EnlaceBoton>
        </>}
      >
        Resumen
      </Titulo>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metrica etiqueta="Clientes registrados" valor={m.clientes} detalle={`+${m.nuevosMes} este mes`} />
        <Metrica etiqueta="Activos (30 días)" valor={m.activos30} detalle={m.clientes ? `${Math.round((m.activos30 / m.clientes) * 100)}% de tus clientes` : undefined} />
        <Metrica etiqueta="Cortes esta semana" valor={m.cortesSemana} />
        <Metrica etiqueta="Cortes este mes" valor={m.cortesMes} />
        <Metrica etiqueta="Recompensas canjeadas" valor={m.canjesTotal} detalle={`${m.canjesMes} este mes`} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Tarjeta><GraficoBarras serie={m.porSemana} titulo="Cortes por semana (últimas 8)" /></Tarjeta>
        <Tarjeta><GraficoBarras serie={m.porMes} titulo="Cortes por mes (últimos 6)" /></Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Cortes por barbero este mes</h2>
      {m.porBarbero.length === 0 ? (
        <Vacio>Aún no tienes barberos. Créalos en la sección «Barberos».</Vacio>
      ) : (
        <Tabla>
          <thead><tr><th>Barbero</th><th className="text-right">Cortes</th><th className="text-right">De ellos, gratis</th></tr></thead>
          <tbody>
            {m.porBarbero.map((b) => (
              <tr key={b.id}>
                <td className="font-medium">{b.nombre}{!b.activo && <span className="ml-2 text-xs text-slate-400">(inactivo)</span>}</td>
                <td className="text-right font-semibold">{b.cortes}</td>
                <td className="text-right text-slate-600">{b.canjes}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      <p className="mt-3 text-xs text-slate-500">«Cortes» cuenta los sellos por corte y los cortes gratis canjeados. El sello de bienvenida no cuenta.</p>
    </>
  );
}
