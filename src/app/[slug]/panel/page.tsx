import { Titulo } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";

export default async function PaginaPanel({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, nombreUsuario } = await requerirDuenoActivo(slug);
  return <Titulo descripcion={`Sesión iniciada como ${nombreUsuario}`}>Panel de {barberia.name}</Titulo>;
}
