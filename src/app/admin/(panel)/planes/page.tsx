import { BotonEnviar, Formulario } from "@/components/formulario";
import { Campo, Insignia, Tarjeta, Titulo } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { conPlataforma } from "@/lib/db";
import { guardarPlanAccion } from "../acciones";

type PlanForm = { name: string; description: string; priceMonthly: string; maxBarbers: number | null; maxCustomers: number | null; sortOrder: number; active: boolean };

function CamposPlan({ p }: { p?: PlanForm }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" name="name" required maxLength={40} defaultValue={p?.name} />
        <Campo etiqueta="Precio mensual (S/)" name="priceMonthly" type="number" step="0.01" min="0" required defaultValue={p?.priceMonthly} />
        <Campo etiqueta="Máx. de barberos" name="maxBarbers" type="number" min="1" defaultValue={p?.maxBarbers ?? ""} ayuda="Vacío = sin límite." />
        <Campo etiqueta="Máx. de clientes" name="maxCustomers" type="number" min="1" defaultValue={p?.maxCustomers ?? ""} ayuda="Vacío = sin límite." />
      </div>
      <Campo etiqueta="Descripción (se muestra en la página de precios)" name="description" maxLength={200} defaultValue={p?.description} />
      <div className="flex items-end gap-6">
        <Campo etiqueta="Orden" name="sortOrder" type="number" min="0" defaultValue={p?.sortOrder ?? 0} className="w-24" />
        <label className="flex items-center gap-2 pb-3 text-sm">
          <input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-5 w-5 rounded border-slate-400" /> Disponible para nuevas barberías
        </label>
      </div>
    </>
  );
}

export default async function PaginaPlanes() {
  await requerirSuperAdmin();
  const planes = await conPlataforma((db) => db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { barbershops: true } } } }));
  return (
    <>
      <Titulo descripcion="Los límites se aplican al instante a las barberías de cada plan.">Planes</Titulo>
      <div className="grid gap-5 lg:grid-cols-2">
        {planes.map((p) => (
          <Tarjeta key={p.id}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">{p.name}</h2>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                {p._count.barbershops} barbería{p._count.barbershops === 1 ? "" : "s"} {p.active ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}
              </span>
            </div>
            <Formulario accion={guardarPlanAccion.bind(null, p.id)}>
              <CamposPlan p={{ ...p, priceMonthly: Number(p.priceMonthly).toFixed(2) }} />
              <BotonEnviar variante="secundario" textoEnviando="Guardando…">Guardar plan</BotonEnviar>
            </Formulario>
          </Tarjeta>
        ))}
        <Tarjeta className="border-dashed">
          <h2 className="mb-3 font-bold">Nuevo plan</h2>
          <Formulario accion={guardarPlanAccion.bind(null, null)} reiniciarAlExito>
            <CamposPlan />
            <BotonEnviar textoEnviando="Creando…">Crear plan</BotonEnviar>
          </Formulario>
        </Tarjeta>
      </div>
    </>
  );
}
