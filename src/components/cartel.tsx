/* eslint-disable @next/next/no-img-element */
"use client";
// Cartel imprimible (A4) con el QR de registro, el logo y el texto de la barbería.
import { Boton, claseBoton } from "./ui";

type Props = { nombre: string; texto: string; recompensa: string; sellos: number; urlRegistro: string; qrDataUrl: string; logoUrl: string | null; slug: string };

export function Cartel({ nombre, texto, recompensa, sellos, urlRegistro, qrDataUrl, logoUrl, slug }: Props) {
  return (
    <div>
      <div className="no-imprimir mb-4 flex flex-wrap gap-2">
        <Boton type="button" onClick={() => window.print()}>Imprimir cartel</Boton>
        <a href={qrDataUrl} download={`qr-${slug}.png`} className={claseBoton({ variante: "secundario" })}>Descargar solo el QR</a>
      </div>

      <style>{`@media print { @page { size: A4 portrait; margin: 0; } .cartel { box-shadow: none !important; border-radius: 0 !important; width: 210mm !important; height: 297mm !important; max-width: none !important; } }`}</style>
      <div className="cartel mx-auto flex aspect-[210/297] w-full max-w-xl flex-col items-center justify-between overflow-hidden rounded-3xl bg-marca p-[6%] text-center text-sobre-marca shadow-xl">
        <div className="flex flex-col items-center gap-3">
          {logoUrl && <img src={logoUrl} alt="" className="h-24 w-24 rounded-3xl bg-white object-contain" />}
          <div className="text-3xl font-extrabold">{nombre}</div>
        </div>
        <div className="text-4xl font-black leading-tight sm:text-5xl">{texto}</div>
        <div className="rounded-3xl bg-white p-4">
          <img src={qrDataUrl} alt={`Código QR para registrarse en ${nombre}`} className="h-auto w-56 sm:w-64" />
        </div>
        <div className="space-y-2">
          <div className="inline-block rounded-full bg-acento px-5 py-2 text-lg font-bold text-sobre-acento">
            Junta {sellos} sellos = {recompensa}
          </div>
          <ol className="flex justify-center gap-4 text-sm opacity-90">
            <li>1. Escanea</li><li>2. Regístrate</li><li>3. Junta sellos</li>
          </ol>
          <div className="text-xs opacity-70">{urlRegistro.replace(/^https?:\/\//, "")}</div>
        </div>
      </div>
    </div>
  );
}
