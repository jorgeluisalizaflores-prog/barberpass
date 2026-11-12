import Link from "next/link";
import { Tabla, Titulo, Vacio } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { formatoFecha, formatoSoles } from "@/lib/fechas";
import { listarPagos } from "@/lib/servicios/admin";

const METODO = { YAPE: "Yape", PLIN: "Plin", TRANSFERENCIA: "Transferencia", EFECTIVO: "Efectivo", OTRO: "Otro" } as const;

export default async function PaginaPagos() {
  await requerirSuperAdmin();
  const pagos = await listarPagos();
  return (
    <>
      <Titulo descripcion="Últimos 100 pagos. Para registrar uno, entra a la ficha de la barbería.">Pagos</Titulo>
      {pagos.length === 0 ? <Vacio>Aún no hay pagos registrados.</Vacio> : (
        <Tabla>
          <thead><tr><th>Fecha</th><th>Barbería</th><th>Plan</th><th>Monto</th><th>Método</th><th>Período cubierto</th><th>Nota</th></tr></thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap">{formatoFecha(p.paidAt)}</td>
                <td><Link href={`/admin/barberias/${p.barbershop.id}`} className="font-semibold underline">{p.barbershop.name}</Link></td>
                <td>{p.plan?.name ?? "—"}</td>
                <td className="font-semibold">{formatoSoles(p.amount)}</td>
                <td>{METODO[p.method]}</td>
                <td className="whitespace-nowrap">{formatoFecha(p.periodStart)} – {formatoFecha(p.periodEnd)}</td>
                <td className="text-slate-600">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
