import Link from "next/link";
import { Alerta, Boton, CLASE_INPUT } from "@/components/ui";
import { contextoBarbero } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { fechaLocalLima } from "@/lib/fechas";
import { buscarClientes } from "@/lib/servicios/sellos";
import { EscanerQr } from "./escaner";

export default async function PaginaBarbero({
  params, searchParams,
}: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string; aviso?: string }> }) {
  const { slug } = await params;
  const { q = "", aviso } = await searchParams;
  const { barberia, barbero } = await contextoBarbero(slug);

  const resultados = q ? await buscarClientes(barberia.id, q) : [];
  const hoy = await conBarberia(barberia.id, (db) =>
    db.stamp.findMany({
      where: { barberId: barbero.id, localDate: fechaLocalLima(), type: { not: "BIENVENIDA" } },
      orderBy: { createdAt: "desc" }, take: 30,
      select: { id: true, customer: { select: { id: true, name: true } } },
    }),
  );

  return (
    <div className="space-y-5">
      {aviso === "qr" && <Alerta tono="aviso">No se encontró ninguna tarjeta con ese código en esta barbería.</Alerta>}

      <EscanerQr slug={slug} />

      <form method="get" className="flex gap-2" role="search">
        <input name="q" defaultValue={q} placeholder="Buscar por celular o nombre" aria-label="Buscar cliente" className={CLASE_INPUT} inputMode="search" autoComplete="off" />
        <Boton type="submit" tamano="lg">Buscar</Boton>
      </form>

      {q && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-600">Resultados para «{q}»</h2>
          {resultados.length === 0 ? (
            <Alerta tono="info">
              No hay clientes que coincidan. Si es nuevo, pídele que escanee el QR del mostrador para registrarse.
            </Alerta>
          ) : (
            <ul className="space-y-2">
              {resultados.map((c) => (
                <li key={c.id}>
                  <Link href={`/${slug}/barbero/cliente/${c.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm active:bg-slate-50">
                    <span>
                      <span className="block text-base font-semibold">{c.name}</span>
                      <span className="block text-sm text-slate-500">{c.phone}</span>
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold">{c.stampsCount} ✂</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Tus sellos de hoy ({hoy.length})</h2>
        {hoy.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no sumaste sellos hoy.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {hoy.map((s) => (
              <li key={s.id}>
                <Link href={`/${slug}/barbero/cliente/${s.customer.id}`} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">{s.customer.name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
