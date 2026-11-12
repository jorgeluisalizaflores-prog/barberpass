"use client";
// Subida del logo. La imagen se reduce en el navegador (máx. 512 px, PNG) antes
// de enviarla, así pesa poco y no hace falta procesarla en el servidor.
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { EstadoForm } from "@/lib/acciones";
import { Alerta, Boton } from "./ui";

async function reducir(archivo: File, lado = 512): Promise<Blob> {
  const img = await createImageBitmap(archivo);
  const escala = Math.min(1, lado / Math.max(img.width, img.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.max(1, Math.round(img.width * escala));
  lienzo.height = Math.max(1, Math.round(img.height * escala));
  lienzo.getContext("2d")!.drawImage(img, 0, 0, lienzo.width, lienzo.height);
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error("No se pudo procesar la imagen"))), "image/png"));
}

export function SubirLogo({ urlActual, accion }: { urlActual: string | null; accion: (fd: FormData) => Promise<EstadoForm> }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<EstadoForm>({});
  const [ocupado, setOcupado] = useState(false);

  async function enviar(blob: Blob | null) {
    setOcupado(true);
    try {
      const fd = new FormData();
      if (blob) fd.append("logo", new File([blob], "logo.png", { type: "image/png" }));
      setEstado(await accion(fd));
      router.refresh();
    } catch {
      setEstado({ error: "No se pudo procesar la imagen. Prueba con un PNG o JPG." });
    } finally {
      setOcupado(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {estado.error && <Alerta tono="error">{estado.error}</Alerta>}
      {estado.ok && <Alerta tono="ok">{estado.ok}</Alerta>}
      <div className="flex items-center gap-4">
        {urlActual ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={urlActual} alt="Logo actual" className="h-20 w-20 rounded-2xl border border-slate-200 bg-white object-contain" />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">Sin logo</div>
        )}
        <div className="flex flex-wrap gap-2">
          <input
            ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" aria-label="Elegir logo"
            onChange={async (e) => {
              const archivo = e.target.files?.[0];
              if (archivo) await enviar(await reducir(archivo).catch(() => null)).catch(() => {});
            }}
          />
          <Boton type="button" variante="secundario" disabled={ocupado} onClick={() => input.current?.click()}>
            {ocupado ? "Subiendo…" : urlActual ? "Cambiar logo" : "Subir logo"}
          </Boton>
          {urlActual && <Boton type="button" variante="fantasma" disabled={ocupado} onClick={() => enviar(null)}>Quitar</Boton>}
        </div>
      </div>
      <p className="text-xs text-slate-500">PNG, JPG o WebP. Se ajusta automáticamente; ideal cuadrado.</p>
    </div>
  );
}
