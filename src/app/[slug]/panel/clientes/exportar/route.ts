// Exportación de clientes a CSV. Solo el dueño de ESTA barbería (queda auditado).
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { fechaLocalLima } from "@/lib/fechas";
import { exportarClientesCsv } from "@/lib/servicios/panel";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, actor } = await requerirDuenoActivo(slug);
  const csv = await exportarClientesCsv(barberia.id, actor);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="clientes-${slug}-${fechaLocalLima()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
