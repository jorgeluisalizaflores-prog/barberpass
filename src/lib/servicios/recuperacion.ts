// Recuperación de contraseña del dueño por correo (enlace de un solo uso, 1 hora).
import { auditar } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { comprobarLimite, registrarFallo } from "../auth/limite";
import { NOMBRE_PLATAFORMA } from "../config";
import { enviarCorreo } from "../correo";
import { conBarberia, conPlataforma, infraestructura } from "../db";
import { sha256, tokenSeguro } from "../tokens";
import { emailSchema, passwordSchema } from "../validacion/esquemas";
import { ErrorNegocio } from "./errores";

const VIGENCIA_MS = 60 * 60 * 1000;

/**
 * Envía el enlace si el correo existe. Nunca revela si existe o no (la
 * respuesta es la misma), para no filtrar qué correos están registrados.
 */
export async function solicitarRecuperacion(emailCrudo: string, ip: string, urlBase: string): Promise<{ enviado: boolean }> {
  const email = emailSchema.safeParse(emailCrudo);
  if (!email.success) return { enviado: false };
  const claves = [`recuperar:${email.data}`, `recuperar-ip:${ip}`];
  for (const c of claves) if ((await comprobarLimite(c, 3)).bloqueado) return { enviado: false };
  await registrarFallo(...claves);

  const dueno = await conPlataforma((db) => db.ownerUser.findUnique({ where: { email: email.data }, select: { id: true, name: true, email: true } }));
  if (!dueno) return { enviado: false };

  const token = tokenSeguro(32);
  await infraestructura.passwordResetToken.create({ data: { ownerUserId: dueno.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + VIGENCIA_MS) } });
  const enviado = await enviarCorreo({
    para: dueno.email,
    asunto: `Restablece tu contraseña de ${NOMBRE_PLATAFORMA}`,
    texto: `Hola ${dueno.name}:\n\nPara crear una nueva contraseña abre este enlace (vale por 1 hora y solo una vez):\n\n${urlBase}/restablecer/${token}\n\nSi no lo pediste, ignora este mensaje.\n\n${NOMBRE_PLATAFORMA}`,
  });
  return { enviado };
}

export async function tokenRecuperacionValido(token: string): Promise<boolean> {
  const t = await infraestructura.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  return !!t && !t.usedAt && t.expiresAt.getTime() > Date.now();
}

export async function restablecerConToken(token: string, passwordNueva: string, ip: string): Promise<void> {
  const password = passwordSchema.parse(passwordNueva);
  // Se marca como usado de forma atómica: el enlace no sirve dos veces.
  const { count } = await infraestructura.passwordResetToken.updateMany({
    where: { tokenHash: sha256(token), usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (count === 0) throw new ErrorNegocio("El enlace ya no es válido. Solicita uno nuevo.", "TOKEN_INVALIDO");
  const t = await infraestructura.passwordResetToken.findUniqueOrThrow({ where: { tokenHash: sha256(token) } });

  const passwordHash = await hashSecreto(password);
  const dueno = await conPlataforma((db) => db.ownerUser.update({ where: { id: t.ownerUserId }, data: { passwordHash }, select: { id: true, name: true, barbershopId: true } }));
  await conBarberia(dueno.barbershopId, (db) =>
    auditar(db, { barbershopId: dueno.barbershopId, actor: { rol: "DUENO", id: dueno.id, nombre: dueno.name, ip }, accion: "dueno.restablecer_password" }),
  );
  // Se cierran todas sus sesiones y se invalidan los demás enlaces pendientes.
  await infraestructura.session.deleteMany({ where: { ownerUserId: dueno.id } });
  await infraestructura.passwordResetToken.updateMany({ where: { ownerUserId: dueno.id, usedAt: null }, data: { usedAt: new Date() } });
}
