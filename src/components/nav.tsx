"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cx } from "./ui";

export type ItemNav = { href: string; etiqueta: string; exacto?: boolean };

/** Navegación horizontal con desplazamiento (cómoda en el celular). */
export function Nav({ items, oscuro = false }: { items: ItemNav[]; oscuro?: boolean }) {
  const ruta = usePathname();
  return (
    <nav className="no-imprimir -mx-4 flex gap-1 overflow-x-auto px-4 pb-1" aria-label="Secciones">
      {items.map((i) => {
        const activo = i.exacto ? ruta === i.href : ruta === i.href || ruta.startsWith(`${i.href}/`);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={activo ? "page" : undefined}
            className={cx(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
              oscuro
                ? activo ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                : activo ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
            )}
          >
            {i.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
