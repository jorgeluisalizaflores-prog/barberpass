// Alta de barberías. La usan el registro público, el panel del super
// administrador, el script de consola y los datos de prueba.
import { auditar, type Actor } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { NOMBRE_PLATAFORMA } from "../config";
import type { Db } from "../db";
import { sumarDias } from "../fechas";
import { politicaPrivacidadBase } from "../privacidad";
import { emailSchema, nombreSchema, passwordSchema, slugSchema } from "../validacion/esquemas";
import { PLANTILLA_CUMPLE, PLANTILLA_RECUPERAR } from "../whatsapp";
import { ErrorNegocio } from "./errores";

export type NuevaBarberia = {
  nombre: string;
  slug: string;
  planId: string;
  telefono?: string;
  ciudad?: string;
  direccion?: string;
  esDemo?: boolean;
  dueno: { nombre: string; email: string; password: string };
};

/** Crea la barbería y su usuario dueño. `db` debe ser de plataforma. */
export async function crearBarberia(db: Db, datos: NuevaBarberia, actor: Actor) {
  const nombre = nombreSchema.parse(datos.nombre);
  const slug = slugSchema.parse(datos.slug);
  const email = emailSchema.parse(datos.dueno.email);
  const password = passwordSchema.parse(datos.dueno.password);
  const nombreDueno = nombreSchema.parse(datos.dueno.nombre);

  if (await db.barbershop.findUnique({ where: { slug }, select: { id: true } })) {
    throw new ErrorNegocio("Esa dirección (slug) ya está en uso. Prueba con otra.", "SLUG_EN_USO");
  }
  if (await db.ownerUser.findUnique({ where: { email }, select: { id: true } })) {
    throw new ErrorNegocio("Ya existe una cuenta con ese correo.", "EMAIL_EN_USO");
  }
  const plan = await db.plan.findUnique({ where: { id: datos.planId } });
  if (!plan) throw new ErrorNegocio("El plan elegido no existe.", "PLAN_INEXISTENTE");

  const cfg = await db.platformSettings.findUnique({ where: { id: 1 } });
  const diasPrueba = cfg?.trialDays ?? 14;
  const politica = cfg?.basePrivacyPolicy?.trim()
    ? cfg.basePrivacyPolicy.replaceAll("{barberia}", nombre)
    : politicaPrivacidadBase(nombre, NOMBRE_PLATAFORMA);

  const barberia = await db.barbershop.create({
    data: {
      slug,
      name: nombre,
      phone: datos.telefono ?? "",
      city: datos.ciudad ?? "",
      address: datos.direccion ?? "",
      planId: plan.id,
      status: "PRUEBA",
      trialEndsAt: sumarDias(new Date(), diasPrueba),
      isDemo: datos.esDemo ?? false,
      privacyPolicy: politica,
      winbackTemplate: PLANTILLA_RECUPERAR,
      birthdayTemplate: PLANTILLA_CUMPLE,
      owners: { create: { email, name: nombreDueno, passwordHash: await hashSecreto(password) } },
    },
    include: { owners: { select: { id: true, email: true } } },
  });

  await auditar(db, {
    barbershopId: barberia.id, actor, accion: "barberia.crear", entidad: "Barbershop", entidadId: barberia.id,
    detalle: { slug, plan: plan.name, dueno: email },
  });
  return barberia;
}
