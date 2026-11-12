// Registro público de una barbería nueva (desde la landing) con prueba gratis.
import { z } from "zod";
import { comprobarLimite, registrarFallo } from "../auth/limite";
import { conBarberia, conPlataforma } from "../db";
import { celularSchema, emailSchema, generarSlug, nombreSchema, passwordSchema, slugSchema } from "../validacion/esquemas";
import { crearBarberia } from "./barberias";
import { ErrorNegocio } from "./errores";

export const registroBarberiaSchema = z.object({
  nombreBarberia: nombreSchema,
  nombreDueno: nombreSchema,
  email: emailSchema,
  password: passwordSchema,
  telefono: z.union([z.literal(""), celularSchema]).default(""),
  ciudad: z.string().trim().max(60).default(""),
  planId: z.string().optional(),
  aceptaTerminos: z.literal(true, { error: "Debes aceptar los términos y la política de privacidad" }),
});

const MAX_ALTAS_POR_IP = 3;

export async function registrarBarberiaPublica(entrada: unknown, ip: string) {
  const d = registroBarberiaSchema.parse(entrada);
  const claveIp = `alta-barberia:${ip}`;
  if ((await comprobarLimite(claveIp, MAX_ALTAS_POR_IP)).bloqueado) {
    throw new ErrorNegocio("Se crearon demasiadas cuentas desde esta conexión. Inténtalo más tarde o escríbenos por WhatsApp.", "LIMITE");
  }

  const barberia = await conPlataforma(async (db) => {
    // Solo se puede elegir un plan activo; si no se indica, el más económico.
    const plan =
      (d.planId ? await db.plan.findFirst({ where: { id: d.planId, active: true } }) : null) ??
      (await db.plan.findFirst({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { priceMonthly: "asc" }] }));
    if (!plan) throw new ErrorNegocio("Por ahora no hay planes disponibles. Escríbenos por WhatsApp.", "SIN_PLANES");

    // Dirección web única a partir del nombre: el-bigote, el-bigote-2, …
    let base = generarSlug(d.nombreBarberia);
    if (!slugSchema.safeParse(base).success) base = `barberia-${base}`.replace(/-+$/, "").slice(0, 36) || "barberia";
    let slug = base;
    for (let i = 2; await db.barbershop.findUnique({ where: { slug }, select: { id: true } }); i++) slug = `${base.slice(0, 36)}-${i}`;

    return crearBarberia(db, {
      nombre: d.nombreBarberia, slug, planId: plan.id, telefono: d.telefono, ciudad: d.ciudad,
      dueno: { nombre: d.nombreDueno, email: d.email, password: d.password },
    }, { rol: "DUENO", id: null, nombre: d.nombreDueno, ip });
  });
  await registrarFallo(claveIp);
  return { barbershopId: barberia.id, slug: barberia.slug, ownerUserId: barberia.owners[0].id };
}

/** Marca el asistente de alta como terminado. */
export async function completarOnboarding(barbershopId: string) {
  await conBarberia(barbershopId, (db) => db.barbershop.updateMany({ where: { onboardingCompletedAt: null }, data: { onboardingCompletedAt: new Date() } }));
}
