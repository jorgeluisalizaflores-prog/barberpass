import { createHash, randomBytes } from "node:crypto";

/** Token aleatorio de 128 bits en base64url (22 caracteres): imposible de adivinar. */
export function tokenSeguro(bytes = 16): string {
  return randomBytes(bytes).toString("base64url");
}

export function sha256(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}
