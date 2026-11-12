"use client";
// Escáner de QR con la cámara del celular. Usa el detector nativo del
// navegador cuando existe y, si no, la librería jsQR (funciona en iPhone).
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alerta, Boton } from "@/components/ui";

type Detector = { detect(fuente: CanvasImageSource): Promise<{ rawValue: string }[]> };

/** Extrae el token del QR solo si pertenece a ESTA barbería. */
function tokenDeQr(texto: string, slug: string): string | null {
  try {
    const url = new URL(texto, window.location.origin);
    const m = new RegExp(`^/${slug}/q/([A-Za-z0-9_-]{16,64})$`).exec(url.pathname);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

export function EscanerQr({ slug }: { slug: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);

  const cerrar = useCallback(() => setAbierto(false), []);

  useEffect(() => {
    if (!abierto) return;
    let activo = true;
    let stream: MediaStream | null = null;
    let cuadro = 0;
    const lienzo = document.createElement("canvas");

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("No se pudo abrir la cámara. Revisa el permiso de cámara del navegador o busca al cliente por su celular.");
        setAbierto(false);
        return;
      }
      const video = videoRef.current;
      if (!activo || !video) return stream.getTracks().forEach((t) => t.stop());
      video.srcObject = stream;
      await video.play().catch(() => {});

      const Nativo = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
      const detector = Nativo ? new Nativo({ formats: ["qr_code"] }) : null;
      const jsQR = detector ? null : (await import("jsqr")).default;

      const leer = async () => {
        if (!activo) return;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          let texto: string | null = null;
          try {
            if (detector) {
              texto = (await detector.detect(video))[0]?.rawValue ?? null;
            } else if (jsQR) {
              const escala = Math.min(1, 640 / video.videoWidth);
              lienzo.width = Math.round(video.videoWidth * escala);
              lienzo.height = Math.round(video.videoHeight * escala);
              const ctx = lienzo.getContext("2d", { willReadFrequently: true })!;
              ctx.drawImage(video, 0, 0, lienzo.width, lienzo.height);
              const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
              texto = jsQR(img.data, img.width, img.height)?.data ?? null;
            }
          } catch { /* cuadro ilegible: se intenta con el siguiente */ }

          if (texto) {
            const token = tokenDeQr(texto, slug);
            if (token) {
              activo = false;
              navigator.vibrate?.(80);
              router.push(`/${slug}/barbero/qr/${token}`);
              return;
            }
            setError("Ese código no es una tarjeta de esta barbería.");
          }
        }
        cuadro = window.setTimeout(leer, 120);
      };
      leer();
    })();

    return () => {
      activo = false;
      window.clearTimeout(cuadro);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [abierto, router, slug]);

  return (
    <div className="space-y-3">
      {error && <Alerta tono="aviso">{error}</Alerta>}
      {abierto ? (
        <div className="overflow-hidden rounded-3xl bg-black">
          <div className="relative aspect-square">
            <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" />
          </div>
          <Boton type="button" variante="fantasma" className="w-full rounded-none py-4 text-white hover:bg-white/10" onClick={cerrar}>Cancelar</Boton>
        </div>
      ) : (
        <Boton type="button" variante="acento" tamano="xl" className="py-8" onClick={() => { setError(""); setAbierto(true); }}>
          <span className="text-3xl" aria-hidden="true">📷</span> Escanear QR del cliente
        </Boton>
      )}
    </div>
  );
}
