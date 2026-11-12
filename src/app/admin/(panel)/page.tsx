import Link from "next/link";
import { InsigniaEstado } from "@/components/insignia-estado";
import { EnlaceBoton, Metrica, Tabla, Titulo, Vacio } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { formatoFecha, formatoSoles } from "@/lib/fechas";
import { metricasGlobales } from "@/lib/servicios/admin";

export default async function PaginaAdmin() {
  await requerirSuperAdmin();
  const m = await metricasGlobales();
  return (
    <>
      <Titulo descripcion="Estado general de la plataforma (no incluye la barbería demo)." acciones={<EnlaceBoton href="/admin/barberias/nueva">Nueva barbería</EnlaceBoton>}>
        Resumen
      </Titulo>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metrica etiqueta="Barberías activas" valor={m.activas} detalle={`${m.enPrueba} en prueba · ${m.vencidas} vencidas · ${m.suspendidas} suspendidas`} />
        <Metrica etiqueta="Ingreso mensual (MRR)" valor={formatoSoles(m.mrr)} detalle="Suma de planes con pago vigente" />
        <Metrica etiqueta="Cobrado este mes" valor={formatoSoles(m.ingresosMes)} detalle={`${formatoSoles(m.ingresosTotal)} en total`} />
        <Metrica etiqueta="Por vencer (7 días)" valor={m.porVencer.length} />
        <Metrica etiqueta="Barberías totales" valor={m.total} />
        <Metrica etiqueta="Clientes finales" valor={m.clientes.toLocaleString("es-PE")} />
        <Metrica etiqueta="Sellos registrados" valor={m.sellos.toLocaleString("es-PE")} />
        <Metrica etiqueta="Recompensas canjeadas" valor={m.canjes.toLocaleString("es-PE")} />
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Barberías por vencer en los próximos 7 días</h2>
      {m.porVencer.length === 0 ? <Vacio>Ninguna barbería vence en los próximos 7 días.</Vacio> : (
        <Tabla>
          <thead><tr><th>Barbería</th><th>Estado</th><th>Plan</th><th>Vence</th><th>Días</th><th>Dueño</th></tr></thead>
          <tbody>
            {m.porVencer.map((b) => (
              <tr key={b.id}>
                <td><Link href={`/admin/barberias/${b.id}`} className="font-semibold underline">{b.name}</Link></td>
                <td><InsigniaEstado s={b.suscripcion} /></td>
                <td>{b.plan.name}</td>
                <td>{formatoFecha(b.suscripcion.venceEl)}</td>
                <td className="font-semibold">{b.suscripcion.diasRestantes}</td>
                <td>{b.owners[0]?.email}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
