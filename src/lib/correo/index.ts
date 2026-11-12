// Envío de correos transaccionales con Resend (https://resend.com), llamando a
// su API HTTP directamente. Es opcional: si RESEND_API_KEY no está definida no
// se envía nada y la función devuelve false (en desarrollo se imprime el
// contenido en la consola para poder probar el flujo).
import { NOMBRE_PLATAFORMA } from "../config";

export function correoConfigurado(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function enviarCorreo(datos: { para: string; asunto: string; texto: string }): Promise<boolean> {
  const clave = process.env.RESEND_API_KEY;
  if (!clave) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[correo no enviado: falta RESEND_API_KEY]\nPara: ${datos.para}\nAsunto: ${datos.asunto}\n${datos.texto}\n`);
    }
    return false;
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${clave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || `${NOMBRE_PLATAFORMA} <onboarding@resend.dev>`,
        to: [datos.para],
        subject: datos.asunto,
        text: datos.texto,
      }),
    });
    if (!r.ok) console.error("Resend respondió", r.status, await r.text().catch(() => ""));
    return r.ok;
  } catch (e) {
    console.error("No se pudo enviar el correo", e);
    return false;
  }
}
