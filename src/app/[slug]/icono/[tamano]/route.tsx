// Ícono PNG de la barbería para la PWA, generado al vuelo con sus colores
// (y su logo si es PNG o JPEG).
import { ImageResponse } from "next/og";
import { conBarberia } from "@/lib/db";
import { colorSobre } from "@/lib/marca";
import { obtenerBarberiaPorSlug } from "@/lib/tenancy/resolver";

const TAMANOS = new Set([180, 192, 512]);

export async function GET(req: Request, { params }: { params: Promise<{ slug: string; tamano: string }> }) {
  const { slug, tamano } = await params;
  const lado = Number(tamano);
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia || !TAMANOS.has(lado)) return new Response("No encontrado", { status: 404 });

  const maskable = new URL(req.url).searchParams.has("m");
  let logo: string | null = null;
  if (barberia.logoMime === "image/png" || barberia.logoMime === "image/jpeg") {
    const fila = await conBarberia(barberia.id, (db) => db.barbershop.findFirst({ select: { logoData: true } }));
    if (fila?.logoData) logo = `data:${barberia.logoMime};base64,${Buffer.from(fila.logoData).toString("base64")}`;
  }
  const iniciales = barberia.name.replace(/barber[ií]a\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const interior = Math.round(lado * (maskable ? 0.56 : 0.72));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: barberia.colorPrimary }}>
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
          <img src={logo} width={interior} height={interior} style={{ borderRadius: interior * 0.18, objectFit: "contain", background: "#fff" }} />
        ) : (
          <div
            style={{
              width: interior, height: interior, borderRadius: interior * 0.24, background: barberia.colorAccent, color: colorSobre(barberia.colorAccent),
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: interior * 0.48, fontWeight: 800,
            }}
          >
            {iniciales || "B"}
          </div>
        )}
      </div>
    ),
    { width: lado, height: lado, headers: { "Cache-Control": "public, max-age=86400" } },
  );
}
