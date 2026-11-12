/** Error de negocio con mensaje apto para mostrar al usuario. */
export class ErrorNegocio extends Error {
  constructor(mensaje: string, public codigo: string = "ERROR") {
    super(mensaje);
    this.name = "ErrorNegocio";
  }
}

/** ¿Es un error de restricción única de Prisma (P2002)? */
export function esDuplicado(e: unknown): boolean {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002";
}
