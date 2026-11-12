"use server";
import { redirect } from "next/navigation";
import { texto, type EstadoForm } from "@/lib/acciones";
import { ipCliente } from "@/lib/auth/guardas";
import { cerrarSesion, crearSesion } from "@/lib/auth/sesion";
import { autenticarDueno } from "@/lib/servicios/autenticacion";

export async function ingresarDueno(_previo: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ip = await ipCliente();
  const r = await autenticarDueno(texto(fd, "email"), String(fd.get("password") ?? ""), ip);
  if (!r.ok) return { error: r.error };

  await crearSesion({ role: "DUENO", ownerUserId: r.ownerUserId, barbershopId: r.barbershopId, ip });

  // Solo se acepta volver a una ruta de SU barbería (evita redirecciones abiertas).
  const siguiente = texto(fd, "siguiente");
  redirect(siguiente.startsWith(`/${r.slug}/`) ? siguiente : `/${r.slug}/panel`);
}

export async function salirDueno(): Promise<void> {
  await cerrarSesion("DUENO");
  redirect("/ingresar");
}
