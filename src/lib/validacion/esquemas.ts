// Validaciones compartidas entre el navegador y el servidor (Zod).
// El servidor SIEMPRE vuelve a validar: la validación del cliente es solo UX.
import { z } from "zod";
import { SLUGS_RESERVADOS } from "../config";

/** Deja solo dígitos y quita el prefijo +51 si viene incluido. */
export function normalizarCelular(valor: string): string {
  let d = (valor || "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("51")) d = d.slice(2);
  return d;
}

export const REGEX_CELULAR_PE = /^9\d{8}$/;

export const celularSchema = z
  .string()
  .transform(normalizarCelular)
  .refine((v) => REGEX_CELULAR_PE.test(v), "Ingresa un celular válido de 9 dígitos que empiece con 9");

export const nombreSchema = z
  .string()
  .trim()
  .min(2, "Ingresa al menos 2 caracteres")
  .max(80, "Máximo 80 caracteres");

export const emailSchema = z.string().trim().toLowerCase().email("Correo no válido").max(160);

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(100, "Máximo 100 caracteres");

export const pinSchema = z.string().regex(/^\d{4,6}$/, "El PIN debe tener de 4 a 6 dígitos");

export const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido");

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mínimo 3 caracteres")
  .max(40, "Máximo 40 caracteres")
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Usa solo minúsculas, números y guiones")
  .refine((s) => !SLUGS_RESERVADOS.has(s), "Esa dirección no está disponible");

/** Convierte "Barbería El Bigote" en "barberia-el-bigote". */
export function generarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export const registroClienteSchema = z
  .object({
    nombre: nombreSchema,
    celular: celularSchema,
    cumpleDia: z.coerce.number().int().min(1).max(31).optional(),
    cumpleMes: z.coerce.number().int().min(1).max(12).optional(),
    aceptaPrivacidad: z.literal(true, { error: "Debes aceptar la política de privacidad" }),
    aceptaWhatsapp: z.boolean().default(false),
  })
  .refine((d) => (d.cumpleDia == null) === (d.cumpleMes == null), {
    message: "Completa el día y el mes de tu cumpleaños, o deja ambos vacíos",
    path: ["cumpleDia"],
  })
  .refine((d) => d.cumpleDia == null || d.cumpleMes == null || d.cumpleDia <= DIAS_POR_MES[d.cumpleMes - 1], {
    message: "Esa fecha de cumpleaños no existe",
    path: ["cumpleDia"],
  });

export type RegistroClienteInput = z.infer<typeof registroClienteSchema>;

/** Primer mensaje de error de Zod, listo para mostrar. */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos no válidos";
}
