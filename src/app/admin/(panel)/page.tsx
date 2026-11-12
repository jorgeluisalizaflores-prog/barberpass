import { Titulo } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";

export default async function PaginaAdmin() {
  const { admin } = await requerirSuperAdmin();
  return <Titulo descripcion={`Sesión iniciada como ${admin.email}`}>Resumen de la plataforma</Titulo>;
}
