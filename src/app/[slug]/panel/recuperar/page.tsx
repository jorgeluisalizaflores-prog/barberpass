import { BotonEnviar, Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Tarjeta, Titulo, Vacio } from "@/components/ui";
import { requerirDuenoActivo } from "@/lib/auth/guardas";
import { clientesParaRecuperar } from "@/lib/servicios/panel";
import { urlBasePublica } from "@/lib/url";
import { PLANTILLA_RECUPERAR } from "@/lib/whatsapp";
import { textosAccion } from "../acciones";
import { ListaContactos } from "../lista-contactos";

export default async function PaginaRecuperar({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia } = await requerirDuenoActivo(slug);
  const clientes = await clientesParaRecuperar(barberia.id, barberia.inactivityDays);
  const plantilla = barberia.winbackTemplate || PLANTILLA_RECUPERAR;

  return (
    <>
      <Titulo descripcion={`Clientes que aceptaron recibir mensajes y no vienen hace más de ${barberia.inactivityDays} días.`}>
        Clientes para recuperar
      </Titulo>

      <details className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Configurar días y mensaje</summary>
        <Formulario accion={textosAccion.bind(null, slug)} className="mt-4 space-y-4">
          <Campo etiqueta="Considerar inactivo después de (días)" name="inactivityDays" type="number" min={7} max={365} defaultValue={barberia.inactivityDays} className="max-w-32" />
          <AreaTexto
            etiqueta="Mensaje de WhatsApp" name="winbackTemplate" rows={4} defaultValue={plantilla}
            ayuda="Puedes usar: {nombre}, {barberia}, {sellos}, {recompensa} y {tarjeta} (enlace a su tarjeta)."
          />
          <BotonEnviar textoEnviando="Guardando…">Guardar</BotonEnviar>
        </Formulario>
      </details>

      {clientes.length === 0 ? (
        <Vacio>¡Buenas noticias! No tienes clientes inactivos que hayan aceptado mensajes.</Vacio>
      ) : (
        <>
          <p className="mb-2 text-sm text-slate-600">{clientes.length} cliente{clientes.length === 1 ? "" : "s"}. Cada botón abre WhatsApp con el mensaje listo para enviar.</p>
          <ListaContactos clientes={clientes} plantilla={plantilla} barberia={barberia} urlBase={await urlBasePublica()} modo="recuperar" />
        </>
      )}
      <Tarjeta className="mt-5 bg-slate-50 text-xs text-slate-600">
        Solo aparecen clientes que marcaron «Acepto recibir mensajes por WhatsApp» al registrarse (Ley N.° 29733).
      </Tarjeta>
    </>
  );
}
