import { BotonConfirmar, BotonEnviar, Formulario } from "@/components/formulario";
import { Alerta, Campo, CLASE_INPUT, Insignia, Tarjeta, Titulo } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { urlBasePublica } from "@/lib/url";
import { crearBarberoAccion, estadoBarberoAccion, pinBarberoAccion } from "../acciones";

export default async function PaginaBarberos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirDuenoActivo(slug);
  const barberos = await conBarberia(barberia.id, (db) =>
    db.barber.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }], select: { id: true, name: true, active: true, createdAt: true } }),
  );
  const activos = barberos.filter((b) => b.active).length;
  const max = barberia.plan.maxBarbers;
  const hayCupo = max == null || activos < max;

  return (
    <>
      <Titulo descripcion={`${activos} activo${activos === 1 ? "" : "s"}${max == null ? " · tu plan no tiene límite" : ` de ${max} que permite tu plan ${barberia.plan.name}`}.`}>
        Barberos
      </Titulo>

      <Alerta tono="info" className="mb-5">
        Tus barberos ingresan desde <strong className="break-all">{await urlBasePublica()}/{slug}/barbero</strong> eligiendo su nombre y marcando su PIN.
      </Alerta>

      <div className="grid gap-5 lg:grid-cols-3">
        <Tarjeta className="lg:col-span-1">
          <h2 className="mb-3 font-bold">Nuevo barbero</h2>
          {hayCupo ? (
            <Formulario accion={crearBarberoAccion.bind(null, slug)} reiniciarAlExito>
              <Campo etiqueta="Nombre" name="nombre" required maxLength={80} placeholder="Ej. Carlos" />
              <Campo etiqueta="PIN (4 a 6 dígitos)" name="pin" required inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="off" ayuda="Entrégaselo solo a él. Podrás cambiarlo cuando quieras." />
              <BotonEnviar textoEnviando="Creando…">Crear barbero</BotonEnviar>
            </Formulario>
          ) : (
            <Alerta tono="aviso">Llegaste al máximo de {max} barbero{max === 1 ? "" : "s"} activo{max === 1 ? "" : "s"} de tu plan {barberia.plan.name}. Desactiva uno o escríbenos para mejorar tu plan.</Alerta>
          )}
        </Tarjeta>

        <div className="space-y-3 lg:col-span-2">
          {barberos.length === 0 && <Tarjeta className="text-sm text-slate-500">Aún no hay barberos.</Tarjeta>}
          {barberos.map((b) => (
            <Tarjeta key={b.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-lg font-bold">
                  {b.name} {b.active ? <Insignia tono="verde">Activo</Insignia> : <Insignia>Inactivo</Insignia>}
                </div>
                <Formulario accion={estadoBarberoAccion.bind(null, slug, b.id, !b.active)} className="text-right">
                  {b.active
                    ? <BotonConfirmar variante="secundario" tamano="sm" mensaje={`¿Desactivar a ${b.name}? No podrá ingresar al panel, pero su historial se conserva.`}>Desactivar</BotonConfirmar>
                    : <BotonEnviar variante="secundario" tamano="sm" textoEnviando="…">Reactivar</BotonEnviar>}
                </Formulario>
              </div>
              {b.active && (
                <Formulario accion={pinBarberoAccion.bind(null, slug, b.id)} reiniciarAlExito className="flex flex-wrap items-end gap-2">
                  <label className="text-sm text-slate-600">
                    Nuevo PIN
                    <input name="pin" required inputMode="numeric" pattern="\d{4,6}" maxLength={6} autoComplete="off" className={`${CLASE_INPUT} mt-1 w-32`} />
                  </label>
                  <BotonEnviar variante="secundario" textoEnviando="…">Cambiar PIN</BotonEnviar>
                </Formulario>
              )}
            </Tarjeta>
          ))}
        </div>
      </div>
    </>
  );
}
