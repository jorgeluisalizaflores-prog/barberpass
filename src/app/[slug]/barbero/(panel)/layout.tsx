import type { Metadata } from "next";
import Link from "next/link";
import { LogoBarberia } from "@/components/marca-barberia";
import { contextoBarbero } from "@/lib/auth/guardas";
import { salirBarbero } from "../acciones-sesion";

export const metadata: Metadata = { title: "Panel del barbero", robots: { index: false } };

export default async function LayoutBarbero({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, barbero } = await contextoBarbero(slug);
  return (
    <div className="flex flex-1 flex-col">
      <header className="bg-marca text-sobre-marca">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Link href={`/${slug}/barbero`} className="flex items-center gap-2 font-bold">
            <LogoBarberia barberia={barberia} tamano={32} />
            <span className="truncate">{barberia.name}</span>
          </Link>
          <form action={salirBarbero.bind(null, slug)} className="flex items-center gap-2 text-sm">
            <span className="opacity-80">{barbero.name}</span>
            <button className="rounded-lg px-2 py-1 underline">Salir</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-5">{children}</main>
    </div>
  );
}
