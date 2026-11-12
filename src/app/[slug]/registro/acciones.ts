"use server";
import { redirect } from "next/navigation";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { ipCliente, requerirBarberia } from "@/lib/auth/guardas";
import { registrarCliente } from "@/lib/servicios/clientes";

export async function registrarClienteAccion(slug: string, _previo: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, suscripcion } = await requerirBarberia(slug);
  if (suscripcion.bloqueada) return { error: "El registro no está disponible por el momento. Consulta en la barbería." };

  let cardToken: string;
  try {
    ({ cardToken } = await registrarCliente(
      barberia.id,
      {
        nombre: texto(fd, "nombre"),
        celular: texto(fd, "celular"),
        cumpleDia: texto(fd, "cumpleDia") || undefined,
        cumpleMes: texto(fd, "cumpleMes") || undefined,
        aceptaPrivacidad: fd.get("aceptaPrivacidad") === "on",
        aceptaWhatsapp: fd.get("aceptaWhatsapp") === "on",
      },
      await ipCliente(),
    ));
  } catch (e) {
    return aEstado(e);
  }
  redirect(`/${slug}/tarjeta/${cardToken}?bienvenida=1`);
}
