// Enlaces wa.me con mensaje ya escrito. En fase 2 este módulo puede sumar el
// envío automático con la API de WhatsApp Business sin cambiar a quien lo usa.

export const PLANTILLA_RECUPERAR =
  "Hola {nombre} 👋, te extrañamos en {barberia}. Ya tienes {sellos} sello(s) en tu tarjeta: ¡ven por tu próximo corte y acércate a tu {recompensa}! {tarjeta}";

export const PLANTILLA_CUMPLE =
  "¡Feliz cumpleaños, {nombre}! 🎉 En {barberia} queremos celebrarlo contigo. Te esperamos este mes para tu corte. {tarjeta}";

export function rellenarPlantilla(plantilla: string, valores: Record<string, string | number>): string {
  return plantilla.replace(/\{(\w+)\}/g, (_, clave: string) => (clave in valores ? String(valores[clave]) : `{${clave}}`));
}

/** Enlace wa.me para un celular peruano de 9 dígitos. */
export function enlaceWhatsapp(celular: string, mensaje: string): string {
  const numero = celular.replace(/\D/g, "");
  const conPais = numero.length === 9 ? `51${numero}` : numero;
  return `https://wa.me/${conPais}?text=${encodeURIComponent(mensaje)}`;
}
