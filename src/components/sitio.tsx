// Cabecera y pie de las páginas públicas de la plataforma.
import Link from "next/link";
import { NOMBRE_PLATAFORMA } from "@/lib/config";
import { LogoPlataforma } from "./logo-plataforma";
import { EnlaceBoton } from "./ui";

export function CabeceraSitio() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <LogoPlataforma claro />
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex" aria-label="Principal">
          <Link href="/#beneficios" className="hover:text-white">Beneficios</Link>
          <Link href="/#como-funciona" className="hover:text-white">Cómo funciona</Link>
          <Link href="/#precios" className="hover:text-white">Precios</Link>
          <Link href="/#preguntas" className="hover:text-white">Preguntas</Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/ingresar" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:text-white">Ingresar</Link>
          <EnlaceBoton href="/registro" variante="acento" tamano="sm">Prueba gratis</EnlaceBoton>
        </div>
      </div>
    </header>
  );
}

export function PieSitio() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-slate-500 sm:flex-row">
        <span>© {new Date().getFullYear()} {NOMBRE_PLATAFORMA} · Hecho en Perú 🇵🇪</span>
        <nav className="flex gap-4" aria-label="Legal">
          <Link href="/terminos" className="hover:underline">Términos</Link>
          <Link href="/privacidad" className="hover:underline">Privacidad</Link>
          <Link href="/ingresar" className="hover:underline">Ingresar</Link>
        </nav>
      </div>
    </footer>
  );
}

export function PaginaLegal({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <>
      <CabeceraSitio />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <h1 className="mb-6 text-3xl font-bold">{titulo}</h1>
        <div className="space-y-4 text-sm leading-relaxed text-slate-700 [&_h2]:pt-3 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900">{children}</div>
      </main>
      <PieSitio />
    </>
  );
}
