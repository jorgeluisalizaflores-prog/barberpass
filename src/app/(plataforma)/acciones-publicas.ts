"use server";
import { redirect } from "next/navigation";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { ipCliente } from "@/lib/auth/guardas";
import { crearSesion } from "@/lib/auth/sesion";
import { correoConfigurado } from "@/lib/correo";
import { restablecerConToken, solicitarRecuperacion } from "@/lib/servicios/recuperacion";
import { registrarBarberiaPublica } from "@/lib/servicios/registro";
import { urlBasePublica } from "@/lib/url";

/** Alta de una barbería desde la landing: crea la cuenta, inicia sesión y abre el asistente. */
export async function registrarBarberiaAccion(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ip = await ipCliente();
  let r: Awaited<ReturnType<typeof registrarBarberiaPublica>>;
  try {
    r = await registrarBarberiaPublica({
      nombreBarberia: texto(fd, "nombreBarberia"), nombreDueno: texto(fd, "nombreDueno"), email: texto(fd, "email"),
      password: String(fd.get("password") ?? ""), telefono: texto(fd, "telefono"), ciudad: texto(fd, "ciudad"),
      planId: texto(fd, "planId") || undefined, aceptaTerminos: fd.get("aceptaTerminos") === "on",
    }, ip);
  } catch (e) { return aEstado(e); }
  await crearSesion({ role: "DUENO", ownerUserId: r.ownerUserId, barbershopId: r.barbershopId, ip });
  redirect(`/${r.slug}/onboarding`);
}

export async function solicitarRecuperacionAccion(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  await solicitarRecuperacion(texto(fd, "email"), await ipCliente(), await urlBasePublica());
  // Misma respuesta exista o no el correo.
  return {
    ok: correoConfigurado()
      ? "Si ese correo tiene una cuenta, te enviamos un enlace para crear una nueva contraseña. Revisa también tu carpeta de spam."
      : "Recibimos tu solicitud. El envío de correos aún no está activo: escríbenos por WhatsApp y restablecemos tu contraseña.",
  };
}

export async function restablecerAccion(token: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const password = String(fd.get("password") ?? "");
  if (password !== String(fd.get("password2") ?? "")) return { error: "Las contraseñas no coinciden." };
  try {
    await restablecerConToken(token, password, await ipCliente());
  } catch (e) { return aEstado(e); }
  redirect("/ingresar?clave=1");
}
