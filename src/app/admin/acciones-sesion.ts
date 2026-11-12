"use server";
import { redirect } from "next/navigation";
import { texto, type EstadoForm } from "@/lib/acciones";
import { ipCliente } from "@/lib/auth/guardas";
import { cerrarSesion, crearSesion } from "@/lib/auth/sesion";
import { autenticarSuperAdmin } from "@/lib/servicios/autenticacion";

export async function ingresarSuperAdmin(_previo: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const ip = await ipCliente();
  const r = await autenticarSuperAdmin(texto(fd, "email"), String(fd.get("password") ?? ""), ip);
  if (!r.ok) return { error: r.error };
  await crearSesion({ role: "SUPER_ADMIN", superAdminId: r.superAdminId, ip });
  redirect("/admin");
}

export async function salirSuperAdmin(): Promise<void> {
  await cerrarSesion("SUPER_ADMIN");
  redirect("/admin/ingresar");
}
