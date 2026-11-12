"use server";
import { redirect } from "next/navigation";
import { texto, type EstadoForm } from "@/lib/acciones";
import { ipCliente, requerirBarberia } from "@/lib/auth/guardas";
import { cerrarSesion, crearSesion } from "@/lib/auth/sesion";
import { autenticarBarbero } from "@/lib/servicios/autenticacion";

export async function ingresarBarbero(slug: string, _previo: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { barberia, suscripcion } = await requerirBarberia(slug);
  if (suscripcion.bloqueada) redirect(`/${slug}/barbero/bloqueado`);
  const ip = await ipCliente();
  const r = await autenticarBarbero(barberia.id, texto(fd, "barberId"), texto(fd, "pin"), ip);
  if (!r.ok) return { error: r.error };
  await crearSesion({ role: "BARBERO", barberId: r.barberId, barbershopId: barberia.id, ip });
  const siguiente = texto(fd, "siguiente");
  redirect(siguiente.startsWith(`/${slug}/`) ? siguiente : `/${slug}/barbero`);
}

export async function salirBarbero(slug: string): Promise<void> {
  await cerrarSesion("BARBERO");
  redirect(`/${slug}/barbero/ingresar`);
}
