// Guardas de acceso por rol. Toda página y toda acción del servidor empieza
// llamando a una de estas funciones; ninguna confía en datos del navegador.
import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Actor } from "../auditoria";
import { conBarberia, conPlataforma } from "../db";
import { calcularSuscripcion, type ResumenSuscripcion } from "../suscripcion/estado";
import { obtenerBarberiaPorSlug, obtenerConfigPlataforma, type BarberiaActual } from "../tenancy/resolver";
import { sesionAutorizaBarberia } from "./autorizacion";
import { leerSesion } from "./sesion";

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "desconocida").trim();
}

// ───────────── Super administrador ─────────────

export async function requerirSuperAdmin(): Promise<{ admin: { id: string; name: string; email: string }; actor: Actor }> {
  const sesion = await leerSesion("SUPER_ADMIN");
  if (!sesion?.superAdminId) redirect("/admin/ingresar");
  const admin = await conPlataforma((db) =>
    db.superAdmin.findUnique({ where: { id: sesion.superAdminId! }, select: { id: true, name: true, email: true } }),
  );
  if (!admin) redirect("/admin/ingresar");
  return { admin, actor: { rol: "SUPER_ADMIN", id: admin.id, nombre: admin.name, ip: await ipCliente() } };
}

// ───────────── Barbería (común) ─────────────

export async function requerirBarberia(slug: string): Promise<{ barberia: BarberiaActual; suscripcion: ResumenSuscripcion }> {
  const barberia = await obtenerBarberiaPorSlug(slug);
  if (!barberia) notFound();
  const cfg = await obtenerConfigPlataforma();
  return { barberia, suscripcion: calcularSuscripcion(barberia, cfg) };
}

// ───────────── Dueño ─────────────

export type ContextoDueno = {
  barberia: BarberiaActual;
  suscripcion: ResumenSuscripcion;
  actor: Actor;
  /** true cuando es el super administrador dando soporte. */
  impersonando: boolean;
  nombreUsuario: string;
};

/**
 * Sesión de dueño válida PARA ESTA barbería. Si la sesión es de otra barbería
 * responde 404 (ni siquiera se confirma que la barbería existe).
 */
export async function contextoDueno(slug: string): Promise<ContextoDueno> {
  const { barberia, suscripcion } = await requerirBarberia(slug);
  const sesion = await leerSesion("DUENO");
  if (!sesion) redirect(`/ingresar?siguiente=${encodeURIComponent(`/${slug}/panel`)}`);
  if (!sesionAutorizaBarberia(sesion, barberia.id, "DUENO")) notFound();

  const ip = await ipCliente();

  if (sesion.impersonatorId) {
    const admin = await conPlataforma((db) =>
      db.superAdmin.findUnique({ where: { id: sesion.impersonatorId! }, select: { id: true, name: true } }),
    );
    if (!admin) redirect("/admin/ingresar");
    return {
      barberia, suscripcion, impersonando: true, nombreUsuario: `${admin.name} (soporte)`,
      actor: { rol: "SUPER_ADMIN", id: admin.id, nombre: admin.name, impersonadorId: admin.id, ip },
    };
  }

  const dueno = await conBarberia(barberia.id, (db) =>
    db.ownerUser.findFirst({ where: { id: sesion.ownerUserId ?? "" }, select: { id: true, name: true } }),
  );
  if (!dueno) redirect("/ingresar");
  return {
    barberia, suscripcion, impersonando: false, nombreUsuario: dueno.name,
    actor: { rol: "DUENO", id: dueno.id, nombre: dueno.name, ip },
  };
}

/** Igual que contextoDueno, pero exige suscripción vigente (o soporte). */
export async function requerirDuenoActivo(slug: string): Promise<ContextoDueno> {
  const ctx = await contextoDueno(slug);
  if (ctx.suscripcion.bloqueada && !ctx.impersonando) redirect(`/${slug}/panel/suscripcion`);
  return ctx;
}

// ───────────── Barbero ─────────────

export type ContextoBarbero = {
  barberia: BarberiaActual;
  suscripcion: ResumenSuscripcion;
  barbero: { id: string; name: string };
  actor: Actor;
};

export async function contextoBarbero(slug: string): Promise<ContextoBarbero> {
  const { barberia, suscripcion } = await requerirBarberia(slug);
  const sesion = await leerSesion("BARBERO");
  if (!sesion) redirect(`/${slug}/barbero/ingresar`);
  if (!sesionAutorizaBarberia(sesion, barberia.id, "BARBERO")) redirect(`/${slug}/barbero/ingresar`);

  const barbero = await conBarberia(barberia.id, (db) =>
    db.barber.findFirst({ where: { id: sesion.barberId ?? "", active: true }, select: { id: true, name: true } }),
  );
  if (!barbero) redirect(`/${slug}/barbero/ingresar`);
  if (suscripcion.bloqueada) redirect(`/${slug}/barbero/bloqueado`);

  return { barberia, suscripcion, barbero, actor: { rol: "BARBERO", id: barbero.id, nombre: barbero.name, ip: await ipCliente() } };
}
