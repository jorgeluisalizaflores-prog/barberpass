import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LogoBarberia } from "@/components/marca-barberia";
import { Alerta, Tarjeta } from "@/components/ui";
import { requerirBarberia } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { ingresarBarbero } from "../acciones-sesion";
import { IngresoPin } from "./ingreso-pin";

export const metadata: Metadata = { title: "Ingreso de barberos", robots: { index: false } };

export default async function PaginaIngresoBarbero({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ siguiente?: string }> }) {
  const { slug } = await params;
  const { siguiente } = await searchParams;
  const { barberia, suscripcion } = await requerirBarberia(slug);
  if (suscripcion.bloqueada) redirect(`/${slug}/barbero/bloqueado`);

  const barberos = await conBarberia(barberia.id, (db) =>
    db.barber.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  );

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-8">
      <div className="mb-5 flex flex-col items-center gap-2 text-center">
        <LogoBarberia barberia={barberia} tamano={64} />
        <h1 className="text-xl font-bold">{barberia.name}</h1>
        <p className="text-sm text-slate-500">Panel del barbero</p>
      </div>
      <Tarjeta>
        {barberos.length === 0 ? (
          <Alerta tono="aviso">Aún no hay barberos registrados. El dueño debe crearlos desde su panel.</Alerta>
        ) : (
          <IngresoPin barberos={barberos} siguiente={siguiente ?? ""} accion={ingresarBarbero.bind(null, slug)} />
        )}
      </Tarjeta>
    </main>
  );
}
