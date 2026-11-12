import { BotonEnviar, Formulario } from "@/components/formulario";
import { AreaTexto, Titulo, Vacio } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { MESES } from "@/lib/fechas";
import { cumpleanosDelMes } from "@/lib/servicios/panel";
import { urlBasePublica } from "@/lib/url";
import { PLANTILLA_CUMPLE } from "@/lib/whatsapp";
import { textosAccion } from "../acciones";
import { ListaContactos } from "../lista-contactos";

export default async function PaginaCumpleanos({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirDuenoActivo(slug);
  const { mes, hoy, clientes } = await cumpleanosDelMes(barberia.id);
  const plantilla = barberia.birthdayTemplate || PLANTILLA_CUMPLE;

  return (
    <>
      <Titulo descripcion={`Clientes que cumplen años en ${MESES[mes - 1]}.`}>Cumpleaños del mes</Titulo>

      <details className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Configurar mensaje de cumpleaños</summary>
        <Formulario accion={textosAccion.bind(null, slug)} className="mt-4 space-y-4">
          <AreaTexto etiqueta="Mensaje de WhatsApp" name="birthdayTemplate" rows={4} defaultValue={plantilla} ayuda="Puedes usar: {nombre}, {barberia}, {sellos}, {recompensa} y {tarjeta}." />
          <BotonEnviar textoEnviando="Guardando…">Guardar</BotonEnviar>
        </Formulario>
      </details>

      {clientes.length === 0 ? (
        <Vacio>Ningún cliente registrado cumple años este mes.</Vacio>
      ) : (
        <ListaContactos clientes={clientes} plantilla={plantilla} barberia={barberia} urlBase={await urlBasePublica()} modo="cumple" hoy={hoy} />
      )}
    </>
  );
}
