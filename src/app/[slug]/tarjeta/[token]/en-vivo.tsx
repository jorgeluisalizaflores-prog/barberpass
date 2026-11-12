"use client";
// Mantiene la tarjeta al día (cuando el barbero suma un sello, el cliente lo ve
// en segundos) y registra el service worker que la hace instalable (PWA).
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function TarjetaEnVivo() {
  const router = useRouter();

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const refrescar = () => {
      if (document.visibilityState === "visible" && navigator.onLine) router.refresh();
    };
    const intervalo = window.setInterval(refrescar, 10_000);
    document.addEventListener("visibilitychange", refrescar);
    return () => {
      window.clearInterval(intervalo);
      document.removeEventListener("visibilitychange", refrescar);
    };
  }, [router]);

  return null;
}
