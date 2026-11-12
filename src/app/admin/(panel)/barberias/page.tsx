import Link from "next/link";
import { InsigniaEstado } from "@/components/insignia-estado";
import { Boton, CLASE_INPUT, EnlaceBoton, Insignia, Tabla, Titulo, Vacio, cx } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { formatoFecha, formatoSoles } from "@/lib/fechas";
import { listarBarberias, type FiltroEstado } from "@/lib/servicios/admin";

const FILTROS: { valor: FiltroEstado; etiqueta: string }[] = [
  { valor: "", etiqueta: "Todas" }, { valor: "PRUEBA", etiqueta: "En prueba" }, { valor: "ACTIVA", etiqueta: "Activas" },
  { valor: "POR_VENCER", etiqueta: "Por vencer" }, { valor: "VENCIDA", etiqueta: "Vencidas" }, { valor: "SUSPENDIDA", etiqueta: "Suspendidas" },
];

export default async function PaginaBarberias({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  await requerirSuperAdmin();
  const { q = "", estado = "" } = await searchParams;
  const filtro = (FILTROS.some((f) => f.valor === estado) ? estado : "") as FiltroEstado;
  const barberias = await listarBarberias({ q, estado: filtro });

  return (
    <>
      <Titulo descripcion={`${barberias.length} barbería${barberias.length === 1 ? "" : "s"}.`} acciones={<EnlaceBoton href="/admin/barberias/nueva">Nueva barbería</EnlaceBoton>}>
        Barberías
      </Titulo>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTROS.map((f) => (
          <Link key={f.valor} href={`/admin/barberias?${new URLSearchParams({ ...(f.valor ? { estado: f.valor } : {}), ...(q ? { q } : {}) })}`}
            className={cx("rounded-full px-3 py-1.5 text-sm font-medium", filtro === f.valor ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200")}>
            {f.etiqueta}
          </Link>
        ))}
        <form method="get" className="ml-auto flex gap-2" role="search">
          {filtro && <input type="hidden" name="estado" value={filtro} />}
          <input name="q" defaultValue={q} placeholder="Nombre, slug o correo" aria-label="Buscar barbería" className={`${CLASE_INPUT} w-56 py-1.5 text-sm`} />
          <Boton type="submit" tamano="sm">Buscar</Boton>
        </form>
      </div>

      {barberias.length === 0 ? <Vacio>No hay barberías con ese filtro.</Vacio> : (
        <Tabla>
          <thead><tr><th>Barbería</th><th>Estado</th><th>Plan</th><th>Vence</th><th className="text-right">Clientes</th><th className="text-right">Barberos</th><th>Dueño</th><th>Alta</th></tr></thead>
          <tbody>
            {barberias.map((b) => (
              <tr key={b.id}>
                <td>
                  <Link href={`/admin/barberias/${b.id}`} className="font-semibold underline">{b.name}</Link>{" "}
                  {b.isDemo && <Insignia tono="azul">Demo</Insignia>}
                  <div className="text-xs text-slate-500">/{b.slug}{b.city ? ` · ${b.city}` : ""}</div>
                </td>
                <td><InsigniaEstado s={b.suscripcion} /></td>
                <td className="whitespace-nowrap">{b.plan.name}<div className="text-xs text-slate-500">{formatoSoles(b.plan.priceMonthly)}</div></td>
                <td className="whitespace-nowrap">{b.suscripcion.venceEl ? formatoFecha(b.suscripcion.venceEl) : "—"}</td>
                <td className="text-right">{b._count.customers}</td>
                <td className="text-right">{b._count.barbers}</td>
                <td className="text-xs">{b.owners[0]?.name}<div className="text-slate-500">{b.owners[0]?.email}</div></td>
                <td className="whitespace-nowrap text-xs text-slate-500">{formatoFecha(b.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
