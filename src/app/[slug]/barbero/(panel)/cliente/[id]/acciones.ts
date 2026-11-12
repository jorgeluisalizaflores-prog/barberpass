"use server";
import { revalidatePath } from "next/cache";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { contextoBarbero } from "@/lib/auth/guardas";
import { canjearRecompensa, sumarSello } from "@/lib/servicios/sellos";

// Cada acción vuelve a comprobar la sesión del barbero y su barbería: nunca se
// confía en que la página que la invoca ya lo hizo.

export async function sumarSelloAccion(slug: string, customerId: string, _previo: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, barbero, actor } = await contextoBarbero(slug);
  const pinDueno = fd.has("pinDueno") ? texto(fd, "pinDueno") : undefined;
  try {
    const r = await sumarSello(barberia.id, { customerId, barberId: barbero.id, actor, pinDueno });
    revalidatePath(`/${slug}/barbero`, "layout");
    return { ok: r.tarjeta.recompensas > 0 ? `¡Sello sumado! ${r.tarjeta.mensaje}` : `¡Sello sumado! Lleva ${r.tarjeta.sellosVisibles} de ${r.tarjeta.sellosRequeridos}.`, codigo: "SELLO" };
  } catch (e) {
    return aEstado(e);
  }
}

export async function canjearAccion(slug: string, customerId: string, _previo: EstadoForm, _fd: FormData): Promise<EstadoForm> {
  const { barberia, barbero, actor } = await contextoBarbero(slug);
  try {
    await canjearRecompensa(barberia.id, { customerId, barberId: barbero.id, actor });
    revalidatePath(`/${slug}/barbero`, "layout");
    return { ok: `¡Recompensa canjeada! Este corte es gratis (${barberia.rewardText}).`, codigo: "CANJE" };
  } catch (e) {
    return aEstado(e);
  }
}
