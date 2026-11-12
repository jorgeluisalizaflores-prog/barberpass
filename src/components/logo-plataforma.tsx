import Link from "next/link";
import { NOMBRE_PLATAFORMA } from "@/lib/config";

export function IconoTijera({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" />
      <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
    </svg>
  );
}

export function IconoNavaja({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M3 17 14 6l4 4L7 21H3v-4Z" /><path d="m14 6 3-3 4 4-3 3" /><path d="M9 11l4 4" />
    </svg>
  );
}

export function LogoPlataforma({ href = "/", claro = false }: { href?: string; claro?: boolean }) {
  return (
    <Link href={href} className={`inline-flex items-center gap-2 text-lg font-extrabold tracking-tight ${claro ? "text-white" : "text-slate-900"}`}>
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-amber-500 text-slate-900"><IconoTijera className="h-5 w-5" /></span>
      {NOMBRE_PLATAFORMA}
    </Link>
  );
}
