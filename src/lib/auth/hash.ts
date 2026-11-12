// Hash de contraseñas y PINs con argon2id. Nunca se guarda texto plano.
// AUTH_PEPPER (opcional) es un secreto del servidor que se mezcla en el hash:
// si alguien robara la base de datos, no podría probar PINs sin él.
import { hash, verify } from "@node-rs/argon2";

function opciones() {
  const pepper = process.env.AUTH_PEPPER;
  return {
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
    ...(pepper ? { secret: Buffer.from(pepper) } : {}),
  };
}

export async function hashSecreto(secreto: string): Promise<string> {
  return hash(secreto, opciones());
}

export async function verificarSecreto(hashGuardado: string | null | undefined, secreto: string): Promise<boolean> {
  if (!hashGuardado) return false;
  try {
    return await verify(hashGuardado, secreto, opciones());
  } catch {
    return false;
  }
}

// Hash de relleno para que el tiempo de respuesta sea igual exista o no la cuenta.
let relleno: Promise<string> | null = null;
export async function verificarContraRelleno(secreto: string): Promise<false> {
  relleno ??= hashSecreto("relleno-sin-cuenta");
  await verificarSecreto(await relleno, secreto);
  return false;
}
