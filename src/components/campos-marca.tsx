// Campos de marca y de programa, reutilizados por el panel del dueño y por el
// asistente de alta (onboarding).
import { Campo, Seleccion } from "./ui";

type Marca = { name: string; phone: string; address: string; city: string; colorPrimary: string; colorAccent: string; stampIcon: string; tagline: string };
type Programa = { stampsRequired: number; rewardText: string; welcomeStampEnabled: boolean; welcomeStamps: number };

export function CamposDatos({ b }: { b: Marca }) {
  return (
    <>
      <Campo etiqueta="Nombre de la barbería" name="name" defaultValue={b.name} required maxLength={80} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="WhatsApp de la barbería (opcional)" name="phone" defaultValue={b.phone} inputMode="numeric" placeholder="9XX XXX XXX" />
        <Campo etiqueta="Ciudad / distrito" name="city" defaultValue={b.city} maxLength={60} placeholder="Ej. Miraflores, Lima" />
      </div>
      <Campo etiqueta="Dirección" name="address" defaultValue={b.address} maxLength={120} placeholder="Ej. Av. Larco 123" />
    </>
  );
}

export function CamposColores({ b }: { b: Marca }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Campo etiqueta="Color principal" name="colorPrimary" type="color" defaultValue={b.colorPrimary} className="h-12 p-1" ayuda="Fondo de la tarjeta y encabezados." />
        <Campo etiqueta="Color de acento" name="colorAccent" type="color" defaultValue={b.colorAccent} className="h-12 p-1" ayuda="Sellos y botones." />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Seleccion etiqueta="Ícono de los sellos" name="stampIcon" defaultValue={b.stampIcon}>
          <option value="TIJERA">Tijera</option>
          <option value="NAVAJA">Navaja</option>
        </Seleccion>
        <Campo etiqueta="Texto del cartel" name="tagline" defaultValue={b.tagline} maxLength={80} required />
      </div>
    </>
  );
}

export function CamposPrograma({ b }: { b: Programa }) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Sellos para ganar la recompensa" name="stampsRequired" type="number" min={2} max={20} defaultValue={b.stampsRequired} required ayuda="Cada corte suma 1 sello." />
        <Campo etiqueta="Recompensa" name="rewardText" defaultValue={b.rewardText} maxLength={60} required ayuda="Ej. Corte gratis, 50% en tu corte, Barba gratis." />
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" name="welcomeStampEnabled" defaultChecked={b.welcomeStampEnabled} className="h-5 w-5 rounded border-slate-400" />
        Regalar sello de bienvenida al registrarse
      </label>
      <Campo etiqueta="Cantidad de sellos de bienvenida" name="welcomeStamps" type="number" min={1} max={3} defaultValue={b.welcomeStamps} className="max-w-32" />
    </>
  );
}
