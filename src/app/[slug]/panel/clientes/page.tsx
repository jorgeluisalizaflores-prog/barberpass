import Link from "next/link";
import { Boton, CLASE_INPUT, claseBoton, Insignia, Tabla, Titulo, Vacio } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { formatoFecha, MESES } from "@/lib/fechas";
import { listarClientes } from "@/lib/servicios/panel";

export default async function PaginaClientes({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; pagina?: string }> }) {
  const { slug } = await params;
  const { q = "", pagina = "1" } = await searchParams;
  const { barberia } = await requerirDuenoActivo(slug);
  const r = await listarClientes(barberia.id, q, Number(pagina));
  const enlacePagina = (p: number) => `/${slug}/panel/clientes?${new URLSearchParams({ ...(q ? { q } : {}), pagina: String(p) })}`;

  return (
    <>
      <Titulo
        descripcion={`${r.total} cliente${r.total === 1 ? "" : "s"}${q ? ` que coinciden con «${q}»` : " registrados"}.`}
        acciones={<a href={`/${slug}/panel/clientes/exportar`} className={claseBoton({ variante: "secundario" })}>Exportar CSV</a>}
      >
        Clientes
      </Titulo>

      <form method="get" className="mb-4 flex max-w-md gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Buscar por nombre o celular" aria-label="Buscar cliente" className={CLASE_INPUT} />
        <Boton type="submit">Buscar</Boton>
      </form>

      {r.clientes.length === 0 ? (
        <Vacio>{q ? "Ningún cliente coincide con la búsqueda." : "Aún no hay clientes. Imprime tu cartel QR y ponlo en el mostrador."}</Vacio>
      ) : (
        <Tabla>
          <thead>
            <tr><th>Cliente</th><th>Celular</th><th className="text-right">Sellos</th><th className="text-right">Canjes</th><th>Última visita</th><th>Cumpleaños</th><th>WhatsApp</th><th></th></tr>
          </thead>
          <tbody>
            {r.clientes.map((c) => (
              <tr key={c.id}>
                <td><div className="font-medium">{c.name}</div><div className="text-xs text-slate-500">Desde {formatoFecha(c.createdAt)}</div></td>
                <td className="whitespace-nowrap">{c.phone}</td>
                <td className="text-right font-semibold">{c.stampsCount}<span className="font-normal text-slate-400"> / {barberia.stampsRequired}</span></td>
                <td className="text-right">{c.totalRedemptions}</td>
                <td className="whitespace-nowrap">{formatoFecha(c.lastVisitAt)}</td>
                <td className="whitespace-nowrap">{c.birthDay && c.birthMonth ? `${c.birthDay} ${MESES[c.birthMonth - 1].slice(0, 3)}` : "—"}</td>
                <td>{c.whatsappOptIn ? <Insignia tono="verde">Acepta</Insignia> : <Insignia>No</Insignia>}</td>
                <td><Link href={`/${slug}/tarjeta/${c.cardToken}`} target="_blank" className="whitespace-nowrap text-sm underline">Ver tarjeta</Link></td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {r.paginas > 1 && (
        <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Paginación">
          {r.pagina > 1 ? <Link href={enlacePagina(r.pagina - 1)} className="underline">← Anterior</Link> : <span />}
          <span className="text-slate-500">Página {r.pagina} de {r.paginas}</span>
          {r.pagina < r.paginas ? <Link href={enlacePagina(r.pagina + 1)} className="underline">Siguiente →</Link> : <span />}
        </nav>
      )}
    </>
  );
}
