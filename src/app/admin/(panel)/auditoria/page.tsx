import Link from "next/link";
import { Boton, CLASE_INPUT, Insignia, Tabla, Titulo, Vacio } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { formatoFechaHora } from "@/lib/fechas";
import { listarAuditoria } from "@/lib/servicios/admin";

const ROL = { SUPER_ADMIN: "Super admin", DUENO: "Dueño", BARBERO: "Barbero", CLIENTE: "Cliente", SISTEMA: "Sistema" } as const;

export default async function PaginaAuditoria({ searchParams }: { searchParams: Promise<{ barberia?: string; accion?: string; pagina?: string }> }) {
  await requerirSuperAdmin();
  const { barberia = "", accion = "", pagina = "1" } = await searchParams;
  const r = await listarAuditoria({ barbershopId: barberia || undefined, accion: accion || undefined, pagina: Number(pagina) });
  const enlace = (p: number) => `/admin/auditoria?${new URLSearchParams({ ...(barberia ? { barberia } : {}), ...(accion ? { accion } : {}), pagina: String(p) })}`;

  return (
    <>
      <Titulo descripcion={`${r.total.toLocaleString("es-PE")} registros. Cada sello, canje, pago y acción administrativa queda aquí; no se pueden editar ni borrar.`}>Auditoría</Titulo>
      <form method="get" className="mb-4 flex flex-wrap gap-2">
        {barberia && <input type="hidden" name="barberia" value={barberia} />}
        <select name="accion" defaultValue={accion} aria-label="Tipo de acción" className={`${CLASE_INPUT} w-auto py-1.5 text-sm`}>
          <option value="">Todas las acciones</option>
          <option value="sello.">Sellos</option><option value="recompensa.">Canjes</option><option value="pago.">Pagos</option>
          <option value="admin.">Super administrador</option><option value="barbero.">Barberos</option><option value="barberia.">Barbería</option>
          <option value="cliente">Clientes</option><option value="dueno.">Ingresos de dueños</option>
        </select>
        <Boton type="submit" tamano="sm">Filtrar</Boton>
        {(barberia || accion) && <Link href="/admin/auditoria" className="self-center text-sm underline">Quitar filtros</Link>}
      </form>

      {r.filas.length === 0 ? <Vacio>Sin registros.</Vacio> : (
        <Tabla>
          <thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Acción</th><th>Barbería</th><th>Detalle</th></tr></thead>
          <tbody>
            {r.filas.map((f) => (
              <tr key={f.id} className="align-top">
                <td className="whitespace-nowrap text-xs">{formatoFechaHora(f.createdAt)}</td>
                <td className="text-xs">
                  <div className="font-medium">{f.actorName || "—"}</div>
                  <div className="text-slate-500">{ROL[f.actorRole]}{f.ip ? ` · ${f.ip}` : ""}</div>
                  {f.impersonatorId && <Insignia tono="ambar">Soporte (impersonación)</Insignia>}
                </td>
                <td className="font-mono text-xs">{f.action}</td>
                <td className="text-xs">{f.barberia ? <Link href={`/admin/auditoria?barberia=${f.barbershopId}`} className="underline">{f.barberia}</Link> : "Plataforma"}</td>
                <td className="max-w-md break-words font-mono text-[11px] text-slate-600">{f.detail ? JSON.stringify(f.detail) : ""}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
      {r.paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {r.pagina > 1 ? <Link href={enlace(r.pagina - 1)} className="underline">← Más recientes</Link> : <span />}
          <span className="text-slate-500">Página {r.pagina} de {r.paginas}</span>
          {r.pagina < r.paginas ? <Link href={enlace(r.pagina + 1)} className="underline">Más antiguos →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
