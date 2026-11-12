// Sirve el logo de la barbería (guardado en la base de datos).
import { conBarberia } from "@/lib/db";
import { obtenerBarberiaPorSlug } from "@/lib/tenancy/resolver";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia?.logoMime) return new Response("Sin logo", { status: 404 });
  const fila = await conBarberia(barberia.id, (db) => db.barbershop.findFirst({ select: { logoData: true, logoMime: true } }));
  if (!fila?.logoData || !fila.logoMime) return new Response("Sin logo", { status: 404 });
  return new Response(Buffer.from(fila.logoData), {
    headers: {
      "Content-Type": fila.logoMime,
      // La URL lleva ?v=<versión>, así que puede cachearse mucho tiempo.
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
