// Service worker mínimo: hace instalable la tarjeta (PWA) y permite abrir la
// última versión vista cuando el celular no tiene señal.
const CACHE = "tarjetas-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Solo se guardan las páginas de tarjeta; los paneles nunca se cachean.
  const esTarjeta = req.mode === "navigate" && /^\/[^/]+\/tarjeta\/[^/]+$/.test(url.pathname);
  if (!esTarjeta) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copia = res.clone();
          caches.open(CACHE).then((c) => c.put(url.pathname, copia));
        }
        return res;
      })
      .catch(async () => (await caches.match(url.pathname)) || new Response("Sin conexión. Vuelve a intentarlo cuando tengas señal.", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })),
  );
});
