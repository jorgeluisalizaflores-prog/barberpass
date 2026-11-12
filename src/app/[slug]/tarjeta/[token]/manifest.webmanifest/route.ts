// Manifest PWA propio de cada tarjeta: al instalarla en la pantalla de inicio
// lleva el nombre, los colores y el ícono de la barbería.
import { obtenerTarjeta } from "@/lib/servicios/clientes";
import { obtenerBarberiaPorSlug } from "@/lib/tenancy/resolver";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia || !(await obtenerTarjeta(barberia.id, token))) return new Response("No encontrado", { status: 404 });

  const v = barberia.logoVersion;
  return Response.json(
    {
      name: `${barberia.name} · Mi tarjeta`,
      short_name: barberia.name.slice(0, 12),
      description: `Tarjeta de fidelidad de ${barberia.name}`,
      lang: "es-PE",
      id: `/${slug}/tarjeta/${token}`,
      start_url: `/${slug}/tarjeta/${token}`,
      scope: `/${slug}/`,
      display: "standalone",
      orientation: "portrait",
      background_color: "#f1f5f9",
      theme_color: barberia.colorPrimary,
      icons: [
        { src: `/${slug}/icono/192?v=${v}`, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: `/${slug}/icono/512?v=${v}`, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: `/${slug}/icono/512?v=${v}&m=1`, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "private, max-age=300" } },
  );
}
