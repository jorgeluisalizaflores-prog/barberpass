import { redirect } from "next/navigation";

// La raíz de la barbería lleva al formulario de registro (destino del QR del mostrador).
export default async function RaizBarberia({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/${slug}/registro`);
}
