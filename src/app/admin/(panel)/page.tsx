import Link from "next/link";
import { InsigniaEstado } from "@/components/insignia-estado";
import { BotonConfirmar, Formulario } from "@/components/formulario";
import { EnlaceBoton, Metrica, Tabla, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { formatoFecha, formatoSoles } from "@/lib/fechas";
import { metricasGlobales } from "@/lib/servicios/admin";
import { DEMO, obtenerDemo } from "@/lib/servicios/demo";
import { impersonarAccion, reiniciarDemoAccion } from "./acciones";

export default async function PaginaAdmin() {
  await requerirSuperAdmin();
  const m = await metricasGlobales();
  const demo = await obtenerDemo();
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

      <h2 className="mb-3 mt-8 text-lg font-bold">Barbería demo</h2>
      <Tarjeta className="space-y-3">
        <p className="text-sm text-slate-600">
          «{DEMO.nombre}» tiene 60 clientes y 5 meses de cortes ficticios para mostrar la plataforma a posibles clientes. No vence ni cuenta en las métricas.
          {demo ? <> Página pública: <Link href="/demo" className="font-semibold underline">/demo</Link> · barberos con PIN {DEMO.pinBarberos}.</> : " Aún no está creada."}
        </p>
        <div className="flex flex-wrap items-start gap-2">
          {demo && <form action={impersonarAccion.bind(null, demo.id)}><button className="rounded-xl bg-acento px-4 py-2.5 text-sm font-semibold text-sobre-acento">Entrar al panel de la demo</button></form>}
          <Formulario accion={reiniciarDemoAccion} className="space-y-2">
            <BotonConfirmar variante="secundario" mensaje={demo ? "Se borrarán los datos actuales de la demo y se generarán de nuevo. ¿Continuar?" : "¿Crear la barbería demo?"}>
              {demo ? "Regenerar datos de la demo" : "Crear barbería demo"}
            </BotonConfirmar>
          </Formulario>
        </div>
      </Tarjeta>
    </>
  );
}
