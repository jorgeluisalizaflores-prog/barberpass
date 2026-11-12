import { CamposColores, CamposDatos, CamposPrograma } from "@/components/campos-marca";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { SubirLogo } from "@/components/subir-logo";
import { AreaTexto, Campo, Tarjeta, Titulo } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { urlLogo } from "@/lib/tenancy/resolver";
import { logoAccion, marcaAccion, pinDuenoAccion, programaAccion, textosAccion } from "../acciones";

export default async function PaginaMarca({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirDuenoActivo(slug);
  const tienePin = !!(await conBarberia(barberia.id, (db) => db.barbershop.findFirst({ select: { ownerPinHash: true } })))?.ownerPinHash;

  return (
    <>
      <Titulo descripcion="Así se ve tu barbería en la tarjeta de tus clientes, el registro y el cartel.">Marca y recompensa</Titulo>
      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta>
          <h2 className="mb-3 font-bold">Logo</h2>
          <SubirLogo urlActual={urlLogo(barberia)} accion={logoAccion.bind(null, slug)} />
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-1 font-bold">PIN de autorización del dueño</h2>
          <p className="mb-3 text-sm text-slate-600">
            Se pide cuando un barbero quiere sumar un segundo sello al mismo cliente en el mismo día.{" "}
            {tienePin ? "Ya tienes uno configurado; puedes cambiarlo." : "Aún no lo configuraste."}
          </p>
          <Formulario accion={pinDuenoAccion.bind(null, slug)} reiniciarAlExito>
            <Campo etiqueta="PIN (4 a 6 dígitos)" name="pin" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required autoComplete="off" className="max-w-40" />
            <BotonEnviar textoEnviando="Guardando…">{tienePin ? "Cambiar PIN" : "Guardar PIN"}</BotonEnviar>
          </Formulario>
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-bold">Datos y colores</h2>
          <Formulario accion={marcaAccion.bind(null, slug)}>
            <CamposDatos b={barberia} />
            <CamposColores b={barberia} />
            <BotonEnviar textoEnviando="Guardando…">Guardar marca</BotonEnviar>
          </Formulario>
        </Tarjeta>

        <Tarjeta>
          <h2 className="mb-3 font-bold">Programa de fidelidad</h2>
          <Formulario accion={programaAccion.bind(null, slug)}>
            <CamposPrograma b={barberia} />
            <input type="hidden" name="inactivityDays" value={barberia.inactivityDays} />
            <BotonEnviar textoEnviando="Guardando…">Guardar programa</BotonEnviar>
          </Formulario>
        </Tarjeta>

        <Tarjeta className="lg:col-span-2">
          <h2 className="mb-1 font-bold">Política de privacidad</h2>
          <p className="mb-3 text-sm text-slate-600">
            Texto base según la Ley N.° 29733. Tus clientes lo aceptan al registrarse. Adáptalo a tu barbería y, de ser posible, hazlo revisar por un abogado.
          </p>
          <Formulario accion={textosAccion.bind(null, slug)}>
            <AreaTexto etiqueta="Texto de la política" name="privacyPolicy" rows={14} defaultValue={barberia.privacyPolicy} className="font-mono text-sm" />
            <BotonEnviar textoEnviando="Guardando…">Guardar política</BotonEnviar>
          </Formulario>
        </Tarjeta>
      </div>
    </>
  );
}
