import { IconoNavaja, IconoTijera } from "./logo-plataforma";
import { cx } from "./ui";

/** Cuadrícula visual de sellos: llenos con el ícono de la barbería, vacíos numerados. */
export function Sellos({ llenos, total, icono, resaltarUltimo = false }: { llenos: number; total: number; icono: string; resaltarUltimo?: boolean }) {
  const Icono = icono === "NAVAJA" ? IconoNavaja : IconoTijera;
  const columnas = total <= 5 ? total : Math.ceil(total / 2);
  return (
    <div
      className="grid justify-items-center gap-3"
      style={{ gridTemplateColumns: `repeat(${Math.min(columnas, 6)}, minmax(0, 1fr))` }}
      role="img"
      aria-label={`${llenos} de ${total} sellos`}
    >
      {Array.from({ length: total }, (_, i) => {
        const lleno = i < llenos;
        return (
          <div
            key={i}
            className={cx(
              "grid aspect-square w-full max-w-16 place-items-center rounded-full border-2 text-sm font-bold",
              lleno ? "border-acento bg-acento text-sobre-acento shadow" : "border-dashed border-slate-300 text-slate-300",
              lleno && resaltarUltimo && i === llenos - 1 && "sello-nuevo",
            )}
          >
            {lleno ? <Icono className="h-1/2 w-1/2" /> : i === total - 1 ? "🎁" : i + 1}
          </div>
        );
      })}
    </div>
  );
}
