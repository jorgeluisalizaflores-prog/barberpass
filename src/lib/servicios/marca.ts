// Configuración de la barbería por parte del dueño: marca, programa de
// fidelidad, PIN de autorización, plantillas y política de privacidad.
// Solo toca campos de marca/programa: el plan y la suscripción NO se pueden
// modificar desde aquí.
import { z } from "zod";
import { auditar, type Actor } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { conBarberia } from "../db";
import { celularSchema, colorSchema, nombreSchema, pinSchema } from "../validacion/esquemas";
import { ErrorNegocio } from "./errores";

export const marcaSchema = z.object({
  name: nombreSchema,
  phone: z.union([z.literal(""), celularSchema]),
  address: z.string().trim().max(120),
  city: z.string().trim().max(60),
  colorPrimary: colorSchema,
  colorAccent: colorSchema,
  stampIcon: z.enum(["TIJERA", "NAVAJA"]),
  tagline: z.string().trim().min(3, "Escribe el texto del cartel").max(80),
});

export const programaSchema = z
  .object({
    stampsRequired: z.coerce.number().int().min(2, "Mínimo 2 sellos").max(20, "Máximo 20 sellos"),
    rewardText: z.string().trim().min(2, "Describe la recompensa").max(60),
    welcomeStampEnabled: z.boolean(),
    welcomeStamps: z.coerce.number().int().min(1).max(3),
    inactivityDays: z.coerce.number().int().min(7, "Mínimo 7 días").max(365, "Máximo 365 días"),
  })
  .refine((d) => !d.welcomeStampEnabled || d.welcomeStamps < d.stampsRequired, {
    message: "Los sellos de bienvenida deben ser menos que los sellos requeridos",
  });

export async function actualizarMarca(barbershopId: string, entrada: unknown, actor: Actor) {
  const data = marcaSchema.parse(entrada);
  await conBarberia(barbershopId, async (db) => {
    await db.barbershop.update({ where: { id: barbershopId }, data });
    await auditar(db, { barbershopId, actor, accion: "barberia.actualizar_marca", entidad: "Barbershop", entidadId: barbershopId, detalle: data });
  });
}

export async function actualizarPrograma(barbershopId: string, entrada: unknown, actor: Actor) {
  const data = programaSchema.parse(entrada);
  await conBarberia(barbershopId, async (db) => {
    await db.barbershop.update({ where: { id: barbershopId }, data });
    await auditar(db, { barbershopId, actor, accion: "barberia.actualizar_programa", entidad: "Barbershop", entidadId: barbershopId, detalle: data });
  });
}

const FIRMAS: { mime: string; firma: number[] }[] = [
  { mime: "image/png", firma: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", firma: [0xff, 0xd8, 0xff] },
  { mime: "image/webp", firma: [0x52, 0x49, 0x46, 0x46] },
];
export const LOGO_MAX_BYTES = 400 * 1024;

/** Guarda el logo (ya reducido en el navegador). Se valida por contenido, no por extensión. */
export async function guardarLogo(barbershopId: string, bytes: Uint8Array | null, actor: Actor) {
  let logoMime: string | null = null;
  if (bytes) {
    if (bytes.length === 0 || bytes.length > LOGO_MAX_BYTES) throw new ErrorNegocio("El logo debe pesar menos de 400 KB.", "LOGO");
    logoMime = FIRMAS.find((f) => f.firma.every((b, i) => bytes[i] === b))?.mime ?? null;
    if (!logoMime) throw new ErrorNegocio("El logo debe ser una imagen PNG, JPG o WebP.", "LOGO");
  }
  await conBarberia(barbershopId, async (db) => {
    await db.barbershop.update({
      where: { id: barbershopId },
      data: { logoData: bytes ? Buffer.from(bytes) : null, logoMime, logoVersion: { increment: 1 } },
    });
    await auditar(db, { barbershopId, actor, accion: bytes ? "barberia.subir_logo" : "barberia.quitar_logo", entidad: "Barbershop", entidadId: barbershopId });
  });
}

export async function guardarPinDueno(barbershopId: string, pin: string, actor: Actor) {
  const ownerPinHash = await hashSecreto(pinSchema.parse(pin));
  await conBarberia(barbershopId, async (db) => {
    await db.barbershop.update({ where: { id: barbershopId }, data: { ownerPinHash } });
    await auditar(db, { barbershopId, actor, accion: "barberia.cambiar_pin_dueno", entidad: "Barbershop", entidadId: barbershopId });
  });
}

const textosSchema = z.object({
  winbackTemplate: z.string().trim().min(10, "El mensaje es muy corto").max(600).optional(),
  birthdayTemplate: z.string().trim().min(10, "El mensaje es muy corto").max(600).optional(),
  privacyPolicy: z.string().trim().min(200, "La política de privacidad es demasiado corta").max(20000).optional(),
});

export async function actualizarTextos(barbershopId: string, entrada: unknown, actor: Actor) {
  const data = textosSchema.parse(entrada);
  await conBarberia(barbershopId, async (db) => {
    await db.barbershop.update({ where: { id: barbershopId }, data });
    await auditar(db, { barbershopId, actor, accion: "barberia.actualizar_textos", entidad: "Barbershop", entidadId: barbershopId, detalle: { campos: Object.keys(data) } });
  });
}
