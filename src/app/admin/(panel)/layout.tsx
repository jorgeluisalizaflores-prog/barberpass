import type { Metadata } from "next";
import { LogoPlataforma } from "@/components/logo-plataforma";
import { Nav } from "@/components/nav";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { salirSuperAdmin } from "../acciones-sesion";

export const metadata: Metadata = { title: { default: "Administración", template: "%s · Administración" }, robots: { index: false } };

const ITEMS = [
  { href: "/admin", etiqueta: "Resumen", exacto: true },
  { href: "/admin/barberias", etiqueta: "Barberías" },
  { href: "/admin/pagos", etiqueta: "Pagos" },
  { href: "/admin/planes", etiqueta: "Planes" },
  { href: "/admin/auditoria", etiqueta: "Auditoría" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
];

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const { admin } = await requerirSuperAdmin();
  return (
    <div className="flex flex-1 flex-col">
      <header className="no-imprimir bg-slate-900 text-white">
        <div className="mx-auto w-full max-w-6xl px-4 pt-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <LogoPlataforma href="/admin" claro />
            <form action={salirSuperAdmin} className="flex items-center gap-3 text-sm">
              <span className="hidden text-slate-300 sm:inline">{admin.name}</span>
              <button className="rounded-lg px-2 py-1 text-slate-300 underline hover:text-white">Salir</button>
            </form>
          </div>
          <Nav items={ITEMS} oscuro />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
