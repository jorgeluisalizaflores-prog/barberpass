/* eslint-disable @next/next/no-img-element */
import { urlLogo } from "@/lib/tenancy/resolver";
import { IconoNavaja, IconoTijera } from "./logo-plataforma";

type Marca = { slug: string; name: string; logoMime: string | null; logoVersion: number; stampIcon: string };

/** Logo de la barbería; si no subió uno, un ícono con su inicial. */
export function LogoBarberia({ barberia, tamano = 56 }: { barberia: Marca; tamano?: number }) {
  const url = urlLogo(barberia);
  if (url) {
    return <img src={url} alt={`Logo de ${barberia.name}`} width={tamano} height={tamano} className="rounded-2xl bg-white object-contain" style={{ width: tamano, height: tamano }} />;
  }
  const Icono = barberia.stampIcon === "NAVAJA" ? IconoNavaja : IconoTijera;
  return (
    <span className="grid place-items-center rounded-2xl bg-acento text-sobre-acento" style={{ width: tamano, height: tamano }}>
      <Icono className="h-1/2 w-1/2" />
    </span>
  );
}
