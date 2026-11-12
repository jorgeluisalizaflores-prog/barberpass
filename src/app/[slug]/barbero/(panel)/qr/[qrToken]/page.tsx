// El barbero escaneó el QR de un cliente: se busca SOLO en su barbería y se
// abre la ficha para sumar el sello.
import { redirect } from "next/navigation";
import { contextoBarbero } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";

export default async function PaginaQrBarbero({ params }: { params: Promise<{ slug: string; qrToken: string }> }) {
  const { slug, qrToken } = await params;
  const { barberia } = await contextoBarbero(slug);
  const cliente = /^[A-Za-z0-9_-]{16,64}$/.test(qrToken)
    ? await conBarberia(barberia.id, (db) => db.customer.findFirst({ where: { qrToken }, select: { id: true } }))
    : null;
  redirect(cliente ? `/${slug}/barbero/cliente/${cliente.id}` : `/${slug}/barbero?aviso=qr`);
}
