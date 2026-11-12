"use server";
// Acciones del super administrador. Todas verifican la sesión de super
// administrador y quedan registradas en la auditoría.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { aEstado, texto, type EstadoForm } from "@/lib/acciones";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { crearSesion } from "@/lib/auth/sesion";
import { conPlataforma } from "@/lib/db";
import {
  editarBarberia, guardarConfiguracion, guardarPlan, reactivarBarberia, registrarImpersonacion, registrarPago,
  restablecerPasswordDueno, suspenderBarberia,
} from "@/lib/servicios/admin";
import { crearBarberia } from "@/lib/servicios/barberias";
import { reiniciarDemo } from "@/lib/servicios/demo";

export async function crearBarberiaAccion(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  let id: string;
  try {
    const b = await conPlataforma((db) =>
      crearBarberia(db, {
        nombre: texto(fd, "nombre"), slug: texto(fd, "slug"), planId: texto(fd, "planId"), telefono: texto(fd, "telefono"), ciudad: texto(fd, "ciudad"),
        dueno: { nombre: texto(fd, "duenoNombre"), email: texto(fd, "duenoEmail"), password: String(fd.get("duenoPassword") ?? "") },
      }, actor),
    );
    id = b.id;
  } catch (e) { return aEstado(e); }
  redirect(`/admin/barberias/${id}`);
}

export async function editarBarberiaAccion(id: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await editarBarberia(id, {
      name: texto(fd, "name"), slug: texto(fd, "slug"), planId: texto(fd, "planId"), phone: texto(fd, "phone"), city: texto(fd, "city"),
      // La fecha del formulario es un día de Lima: vence al final de ese día.
      trialEndsAt: `${texto(fd, "trialEndsAt")}T23:59:59-05:00`,
    }, actor);
    revalidatePath("/admin", "layout");
    return { ok: "Cambios guardados." };
  } catch (e) { return aEstado(e); }
}

export async function suspenderAccion(id: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await suspenderBarberia(id, texto(fd, "motivo"), actor);
    revalidatePath("/admin", "layout");
    return { ok: "Barbería suspendida." };
  } catch (e) { return aEstado(e); }
}

export async function reactivarAccion(id: string, _p: EstadoForm, _fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await reactivarBarberia(id, actor);
    revalidatePath("/admin", "layout");
    return { ok: "Barbería reactivada." };
  } catch (e) { return aEstado(e); }
}

export async function registrarPagoAccion(id: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    const pago = await registrarPago(id, {
      monto: texto(fd, "monto"), metodo: texto(fd, "metodo"), meses: texto(fd, "meses"), nota: texto(fd, "nota"),
      fecha: `${texto(fd, "fecha")}T12:00:00-05:00`,
    }, actor);
    revalidatePath("/admin", "layout");
    return { ok: `Pago registrado. Nuevo vencimiento: ${pago.periodEnd.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "2-digit", month: "long", year: "numeric" })}.` };
  } catch (e) { return aEstado(e); }
}

export async function restablecerPasswordAccion(ownerUserId: string, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await restablecerPasswordDueno(ownerUserId, String(fd.get("password") ?? ""), actor);
    return { ok: "Contraseña restablecida. Compártela con el dueño por un canal seguro." };
  } catch (e) { return aEstado(e); }
}

/** "Entrar como" la barbería para dar soporte: sesión de 1 hora, auditada. */
export async function impersonarAccion(id: string): Promise<void> {
  const { admin, actor } = await requerirSuperAdmin();
  const b = await registrarImpersonacion(id, actor);
  await crearSesion({ role: "DUENO", barbershopId: b.id, impersonatorId: admin.id, ip: actor.ip });
  redirect(`/${b.slug}/panel`);
}

export async function guardarPlanAccion(id: string | null, _p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await guardarPlan(id, {
      name: texto(fd, "name"), description: texto(fd, "description"), priceMonthly: texto(fd, "priceMonthly"),
      maxBarbers: texto(fd, "maxBarbers"), maxCustomers: texto(fd, "maxCustomers"), sortOrder: texto(fd, "sortOrder") || "0",
      active: fd.get("active") === "on",
    }, actor);
    revalidatePath("/admin", "layout");
    return { ok: id ? "Plan actualizado." : "Plan creado." };
  } catch (e) { return aEstado(e); }
}

export async function guardarConfiguracionAccion(_p: EstadoForm, fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    await guardarConfiguracion({
      trialDays: texto(fd, "trialDays"), graceDays: texto(fd, "graceDays"), expiringNoticeDays: texto(fd, "expiringNoticeDays"),
      contactWhatsapp: texto(fd, "contactWhatsapp"), basePrivacyPolicy: texto(fd, "basePrivacyPolicy"),
    }, actor);
    revalidatePath("/", "layout");
    return { ok: "Configuración guardada." };
  } catch (e) { return aEstado(e); }
}

/** Crea o regenera la barbería demo con datos ficticios. */
export async function reiniciarDemoAccion(_p: EstadoForm, _fd: FormData): Promise<EstadoForm> {
  const { actor } = await requerirSuperAdmin();
  try {
    const d = await reiniciarDemo(actor);
    revalidatePath("/", "layout");
    return { ok: `Demo lista en /${d.slug}. Dueño demo: ${d.email} / ${d.password}.` };
  } catch (e) { return aEstado(e); }
}
