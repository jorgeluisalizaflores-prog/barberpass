import type { Serie } from "@/lib/servicios/panel";

/** Gráfico de barras simple hecho con CSS (sin librerías). */
export function GraficoBarras({ serie, titulo }: { serie: Serie; titulo: string }) {
  const max = Math.max(1, ...serie.map((s) => s.valor));
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-slate-700">{titulo}</figcaption>
      <div className="flex h-40 items-end gap-2" role="img" aria-label={`${titulo}: ${serie.map((s) => `${s.etiqueta} ${s.valor}`).join(", ")}`}>
        {serie.map((s, i) => (
          <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
            <span className="text-xs font-semibold text-slate-700">{s.valor}</span>
            <div className="w-full rounded-t-md bg-marca" style={{ height: `${Math.max(2, (s.valor / max) * 100)}%`, opacity: s.valor ? 1 : 0.15 }} />
            <span className="text-[11px] text-slate-500">{s.etiqueta}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
