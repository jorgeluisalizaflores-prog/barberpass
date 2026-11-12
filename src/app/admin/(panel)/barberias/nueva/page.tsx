import { BotonEnviar, Formulario } from "@/components/formulario";
import { Campo, Seleccion, Tarjeta, Titulo } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { conPlataforma } from "@/lib/db";
import { formatoSoles } from "@/lib/fechas";
import { crearBarberiaAccion } from "../../acciones";

export default async function PaginaNuevaBarberia() {
  await requerirSuperAdmin();
  const planes = await conPlataforma((db) => db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }));
  return (
    <>
      <Titulo descripcion="Alta manual. La barbería empieza con los días de prueba configurados.">Nueva barbería</Titulo>
      <Tarjeta className="max-w-2xl">
        <Formulario accion={crearBarberiaAccion}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre de la barbería" name="nombre" required maxLength={80} />
            <Campo etiqueta="Dirección web (slug)" name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={40} placeholder="barberia-el-bigote" ayuda="Solo minúsculas, números y guiones." />
            <Seleccion etiqueta="Plan" name="planId" required>
              {planes.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatoSoles(p.priceMonthly)}/mes</option>)}
            </Seleccion>
            <Campo etiqueta="Ciudad / distrito" name="ciudad" maxLength={60} />
          </div>
          <h2 className="pt-2 font-bold">Dueño</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Nombre" name="duenoNombre" required maxLength={80} />
            <Campo etiqueta="Correo" name="duenoEmail" type="email" required />
            <Campo etiqueta="Contraseña inicial" name="duenoPassword" type="text" required minLength={8} autoComplete="off" ayuda="Mínimo 8 caracteres. Compártela con el dueño." />
          </div>
          <BotonEnviar textoEnviando="Creando…">Crear barbería</BotonEnviar>
        </Formulario>
      </Tarjeta>
    </>
  );
}
