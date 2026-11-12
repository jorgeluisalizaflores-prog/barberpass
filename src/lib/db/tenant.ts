// ═══════════════════════════════════════════════════════════════════════
// ACCESO A DATOS CON AISLAMIENTO POR BARBERÍA
//
// Dos únicas puertas de entrada a la base de datos:
//
//   conBarberia(id, fn)  → todo lo que haga `fn` queda limitado a esa barbería.
//        Capa 1: una extensión de Prisma inyecta el filtro `barbershopId` en
//                cada consulta y en cada alta.
//        Capa 2: la transacción declara `app.barbershop_id` y PostgreSQL (RLS)
//                rechaza cualquier fila de otra barbería.
//
//   conPlataforma(fn)    → acceso global, SOLO para el super administrador y
//        para tareas de infraestructura (inicio de sesión, resolver el slug).
// ═══════════════════════════════════════════════════════════════════════
import { Prisma } from "@prisma/client";
import { prismaCrudo } from "./client";

/** Cliente transaccional que reciben los servicios. */
export type Db = Prisma.TransactionClient;

// Modelos que pertenecen a una barbería → columna que la identifica.
export const MODELOS_POR_BARBERIA: Record<string, string> = {
  Barbershop: "id",
  OwnerUser: "barbershopId",
  Barber: "barbershopId",
  Customer: "barbershopId",
  Stamp: "barbershopId",
  Redemption: "barbershopId",
  Payment: "barbershopId",
  AuditLog: "barbershopId",
};

// Modelos globales que una barbería puede LEER (nunca escribir).
const MODELOS_GLOBALES_LECTURA = new Set(["Plan", "PlatformSettings"]);

const OPERACIONES_LECTURA = new Set([
  "findUnique", "findUniqueOrThrow", "findFirst", "findFirstOrThrow", "findMany",
  "count", "aggregate", "groupBy",
]);
const OPERACIONES_CON_WHERE = new Set([
  ...OPERACIONES_LECTURA, "update", "updateMany", "updateManyAndReturn", "delete", "deleteMany",
]);

type Args = { where?: Record<string, unknown>; data?: unknown; create?: unknown; update?: unknown };

/**
 * Añade el filtro de barbería con AND, sin pisar lo que pidió quien llama: si
 * pide una fila de otra barbería, las dos condiciones se contradicen y no hay
 * resultado (en vez de devolver por error una fila propia).
 */
function conFiltro(where: Record<string, unknown> | undefined, campo: string, id: string): Record<string, unknown> {
  const w = where ?? {};
  const previo = w.AND === undefined ? [] : Array.isArray(w.AND) ? w.AND : [w.AND];
  return { ...w, AND: [...previo, { [campo]: id }] };
}

function conCampo(data: unknown, campo: string, id: string, modelo: string): unknown {
  if (Array.isArray(data)) return data.map((d) => conCampo(d, campo, id, modelo));
  const fila = { ...(data as Record<string, unknown>) };
  if (fila[campo] !== undefined && fila[campo] !== id) {
    throw new Error(`Intento de escribir ${modelo} en otra barbería`);
  }
  fila[campo] = id;
  return fila;
}

/** Extensión de Prisma que fuerza el ámbito de una barbería (capa 1). */
function extensionBarberia(barbershopId: string) {
  return Prisma.defineExtension({
    name: "ambito-barberia",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const campo = MODELOS_POR_BARBERIA[model];

          if (!campo) {
            if (MODELOS_GLOBALES_LECTURA.has(model) && OPERACIONES_LECTURA.has(operation)) {
              return query(args);
            }
            throw new Error(`El modelo ${model} no es accesible desde el contexto de una barbería`);
          }

          const a = { ...(args as Args) };

          if (OPERACIONES_CON_WHERE.has(operation)) {
            a.where = conFiltro(a.where, campo, barbershopId);
            if (a.data !== undefined) {
              const d = a.data as Record<string, unknown>;
              if (d[campo] !== undefined && d[campo] !== barbershopId) {
                throw new Error(`Intento de mover ${model} a otra barbería`);
              }
            }
          } else if (operation === "create" || operation === "createMany" || operation === "createManyAndReturn") {
            if (model === "Barbershop") throw new Error("Una barbería no puede crear otra barbería");
            a.data = conCampo(a.data, campo, barbershopId, model);
          } else if (operation === "upsert") {
            if (model === "Barbershop") throw new Error("Una barbería no puede crear otra barbería");
            a.where = conFiltro(a.where, campo, barbershopId);
            a.create = conCampo(a.create, campo, barbershopId, model);
          } else {
            throw new Error(`Operación ${operation} no permitida en el contexto de una barbería`);
          }
          return query(a as typeof args);
        },
      },
    },
  });
}

const OPCIONES_TX = { maxWait: 10_000, timeout: 20_000 };

/** Ejecuta `fn` limitado a UNA barbería (extensión de Prisma + RLS). */
export async function conBarberia<T>(barbershopId: string, fn: (db: Db) => Promise<T>): Promise<T> {
  if (!barbershopId) throw new Error("conBarberia requiere el id de la barbería");
  const cliente = prismaCrudo.$extends(extensionBarberia(barbershopId));
  return cliente.$transaction(async (tx) => {
    // set_config(..., true) = válido solo dentro de esta transacción.
    await tx.$executeRaw`SELECT set_config('app.barbershop_id', ${barbershopId}, true)`;
    return fn(tx as unknown as Db);
  }, OPCIONES_TX);
}

/**
 * Acceso global de plataforma. Úsalo solo en el panel del super administrador
 * y en infraestructura (login, resolver slug). Nunca en código de una barbería.
 */
export async function conPlataforma<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return prismaCrudo.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.plataforma', 'on', true)`;
    return fn(tx);
  }, OPCIONES_TX);
}

/** Tablas globales sin datos de barberías (sesiones, intentos de login, enlaces de recuperación). */
export const infraestructura = {
  session: prismaCrudo.session,
  loginAttempt: prismaCrudo.loginAttempt,
  passwordResetToken: prismaCrudo.passwordResetToken,
};
