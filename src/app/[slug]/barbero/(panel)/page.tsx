import { contextoBarbero } from "@/lib/auth/guardas";

export default async function PaginaBarbero({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barbero } = await contextoBarbero(slug);
  return <h1 className="text-xl font-bold">Hola, {barbero.name}</h1>;
}
