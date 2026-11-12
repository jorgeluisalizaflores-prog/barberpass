import { BotonEnviar, Formulario } from "@/components/formulario";
import { AreaTexto, Campo, Tarjeta, Titulo } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { obtenerConfigPlataforma } from "@/lib/tenancy/resolver";
import { guardarConfiguracionAccion } from "../acciones";

export default async function PaginaConfiguracion() {
  await requerirSuperAdmin();
  const c = await obtenerConfigPlataforma();
  return (
    <>
      <Titulo descripcion="Reglas generales de prueba, vencimiento y contacto.">Configuración</Titulo>
      <Tarjeta className="max-w-3xl">
        <Formulario accion={guardarConfiguracionAccion}>
          <div className="grid gap-4 sm:grid-cols-3">
            <Campo etiqueta="Días de prueba gratis" name="trialDays" type="number" min={1} max={90} required defaultValue={c.trialDays} ayuda="Para barberías nuevas." />
            <Campo etiqueta="Días de gracia" name="graceDays" type="number" min={0} max={60} required defaultValue={c.graceDays} ayuda="Tras vencer, antes de bloquear." />
            <Campo etiqueta="Aviso de vencimiento (días)" name="expiringNoticeDays" type="number" min={1} max={30} required defaultValue={c.expiringNoticeDays} />
          </div>
          <Campo etiqueta="WhatsApp de contacto y ventas" name="contactWhatsapp" inputMode="numeric" placeholder="9XX XXX XXX" defaultValue={c.contactWhatsapp} className="max-w-xs" ayuda="Se usa en la landing y en el botón «Renovar por WhatsApp»." />
          <AreaTexto etiqueta="Política de privacidad base para barberías nuevas" name="basePrivacyPolicy" rows={12} defaultValue={c.basePrivacyPolicy} className="font-mono text-sm" ayuda="Usa {barberia} donde debe ir el nombre de cada barbería. Vacío = texto base incluido en el sistema." />
          <BotonEnviar textoEnviando="Guardando…">Guardar configuración</BotonEnviar>
        </Formulario>
      </Tarjeta>
    </>
  );
}
