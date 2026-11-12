// Componentes visuales básicos, compartidos por toda la aplicación.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export function cx(...clases: (string | false | null | undefined)[]): string {
  return clases.filter(Boolean).join(" ");
}

const BASE_BOTON =
  "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 disabled:opacity-50 disabled:pointer-events-none";

const VARIANTES = {
  primario: "bg-marca text-sobre-marca hover:opacity-90",
  acento: "bg-acento text-sobre-acento hover:opacity-90",
  secundario: "bg-white text-slate-800 border border-slate-300 hover:bg-slate-50",
  peligro: "bg-red-600 text-white hover:bg-red-700",
  fantasma: "text-slate-700 hover:bg-slate-100",
  whatsapp: "bg-[#25D366] text-white hover:opacity-90",
} as const;

const TAMANOS = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-6 py-3.5 text-base",
  xl: "px-6 py-5 text-xl w-full",
} as const;

type EstiloBoton = { variante?: keyof typeof VARIANTES; tamano?: keyof typeof TAMANOS };

export function claseBoton({ variante = "primario", tamano = "md" }: EstiloBoton = {}, extra?: string): string {
  return cx(BASE_BOTON, VARIANTES[variante], TAMANOS[tamano], extra);
}

export function Boton({ variante, tamano, className, ...props }: ComponentProps<"button"> & EstiloBoton) {
  return <button {...props} className={claseBoton({ variante, tamano }, className)} />;
}

export function EnlaceBoton({ variante, tamano, className, ...props }: ComponentProps<typeof Link> & EstiloBoton) {
  return <Link {...props} className={claseBoton({ variante, tamano }, className)} />;
}

export const CLASE_INPUT =
  "block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-200";

export function Campo({
  etiqueta, ayuda, className, children, ...props
}: ComponentProps<"input"> & { etiqueta: string; ayuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      {children ?? <input {...props} className={cx(CLASE_INPUT, className)} />}
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

export function AreaTexto({ etiqueta, ayuda, className, ...props }: ComponentProps<"textarea"> & { etiqueta: string; ayuda?: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      <textarea {...props} className={cx(CLASE_INPUT, className)} />
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

export function Seleccion({ etiqueta, className, children, ...props }: ComponentProps<"select"> & { etiqueta: string }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{etiqueta}</span>
      <select {...props} className={cx(CLASE_INPUT, className)}>{children}</select>
    </label>
  );
}

export function Tarjeta({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cx("rounded-2xl border border-slate-200 bg-white p-5 shadow-sm", className)} />;
}

const TONOS_ALERTA = {
  error: "border-red-200 bg-red-50 text-red-800",
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  aviso: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-sky-200 bg-sky-50 text-sky-900",
} as const;

export function Alerta({ tono = "info", className, ...props }: ComponentProps<"div"> & { tono?: keyof typeof TONOS_ALERTA }) {
  return <div role={tono === "error" ? "alert" : "status"} {...props} className={cx("rounded-xl border px-4 py-3 text-sm", TONOS_ALERTA[tono], className)} />;
}

const TONOS_INSIGNIA = {
  gris: "bg-slate-100 text-slate-700",
  verde: "bg-emerald-100 text-emerald-800",
  ambar: "bg-amber-100 text-amber-800",
  rojo: "bg-red-100 text-red-800",
  azul: "bg-sky-100 text-sky-800",
} as const;

export function Insignia({ tono = "gris", children }: { tono?: keyof typeof TONOS_INSIGNIA; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", TONOS_INSIGNIA[tono])}>{children}</span>;
}

export function Titulo({ children, descripcion, acciones }: { children: ReactNode; descripcion?: ReactNode; acciones?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{children}</h1>
        {descripcion && <p className="mt-1 text-sm text-slate-600">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </div>
  );
}

export function Metrica({ etiqueta, valor, detalle }: { etiqueta: string; valor: ReactNode; detalle?: ReactNode }) {
  return (
    <Tarjeta className="p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{etiqueta}</div>
      <div className="mt-1 text-3xl font-bold text-slate-900">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-slate-500">{detalle}</div>}
    </Tarjeta>
  );
}

export function Tabla({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_th]:text-xs [&_th]:font-semibold [&_th]:uppercase [&_th]:tracking-wide [&_th]:text-slate-500 [&_tbody_tr]:border-t [&_tbody_tr]:border-slate-100">
        {children}
      </table>
    </div>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">{children}</div>;
}
