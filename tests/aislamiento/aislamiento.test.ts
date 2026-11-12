// ═══════════════════════════════════════════════════════════════════════
// PRUEBAS DE AISLAMIENTO ENTRE BARBERÍAS
// Una barbería nunca puede ver ni modificar datos de otra. Se verifica en las
// tres capas: extensión de Prisma, Row Level Security y claves compuestas.
// ═══════════════════════════════════════════════════════════════════════
import { beforeAll, describe, expect, it } from "vitest";
import { sesionAutorizaBarberia } from "../../src/lib/auth/autorizacion";
import { conBarberia, conPlataforma, MODELOS_POR_BARBERIA } from "../../src/lib/db";
import { prismaCrudo } from "../../src/lib/db/client";
import { tokenSeguro } from "../../src/lib/tokens";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;

beforeAll(async () => {
  e = await crearEscenario();
  // Un sello, un canje, un pago y auditoría en cada barbería.
  for (const x of [e.A, e.B]) {
    await conBarberia(x.barberia.id, async (db) => {
      await db.stamp.create({ data: { barbershopId: x.barberia.id, customerId: x.cliente.id, barberId: x.barbero.id, localDate: "2026-01-10" } });
      await db.redemption.create({ data: { barbershopId: x.barberia.id, customerId: x.cliente.id, barberId: x.barbero.id, stampsUsed: 5, rewardText: "Corte gratis" } });
    });
    await conPlataforma((db) =>
      db.payment.create({
        data: { barbershopId: x.barberia.id, amount: 49, method: "YAPE", paidAt: new Date(), periodStart: new Date(), periodEnd: new Date() },
      }),
    );
  }
});

describe("Configuración de seguridad de la base de datos", () => {
  it("la aplicación se conecta con un rol que NO puede saltarse RLS", async () => {
    const [rol] = await prismaCrudo.$queryRaw<{ rolsuper: boolean; rolbypassrls: boolean }[]>`
      SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`;
    expect(rol.rolsuper).toBe(false);
    expect(rol.rolbypassrls).toBe(false);
    const propias = await prismaCrudo.$queryRaw<{ n: bigint }[]>`
      SELECT count(*) AS n FROM pg_tables WHERE schemaname = 'public' AND tableowner = current_user`;
    expect(Number(propias[0].n)).toBe(0);
  });

  it("toda tabla con datos de barbería tiene RLS activo y está registrada en el código", async () => {
    const tablas = await dbDuenoTablas.$queryRaw<{ tabla: string; rls: boolean }[]>`
      SELECT c.relname AS tabla, c.relrowsecurity AS rls
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
      WHERE c.relkind = 'r'
        AND (c.relname = 'Barbershop' OR EXISTS (
          SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attname = 'barbershopId' AND NOT a.attisdropped))
        AND c.relname <> 'Session'`;
    expect(tablas.length).toBeGreaterThanOrEqual(8);
    for (const t of tablas) {
      expect(t.rls, `La tabla ${t.tabla} no tiene RLS`).toBe(true);
      expect(MODELOS_POR_BARBERIA[t.tabla], `Falta ${t.tabla} en MODELOS_POR_BARBERIA`).toBeDefined();
    }
  });

  it("sin contexto de barbería ni de plataforma no se ve ninguna fila", async () => {
    expect(await prismaCrudo.customer.count()).toBe(0);
    expect(await prismaCrudo.barbershop.count()).toBe(0);
    expect(await prismaCrudo.stamp.count()).toBe(0);
    expect(await prismaCrudo.payment.count()).toBe(0);
    expect(await prismaCrudo.ownerUser.count()).toBe(0);
  });
});

describe("Capa 1: la extensión de Prisma filtra por barbería", () => {
  it("las listas solo devuelven filas de la propia barbería", async () => {
    await conBarberia(e.A.barberia.id, async (db) => {
      const id = e.A.barberia.id;
      expect((await db.barbershop.findMany()).map((b) => b.id)).toEqual([id]);
      for (const filas of [
        await db.ownerUser.findMany(), await db.barber.findMany(), await db.customer.findMany(),
        await db.stamp.findMany(), await db.redemption.findMany(), await db.payment.findMany(),
        await db.auditLog.findMany(),
      ]) {
        expect(filas.length).toBeGreaterThan(0);
        expect(filas.every((f) => f.barbershopId === id)).toBe(true);
      }
    });
  });

  it("no puede leer por id una fila de otra barbería", async () => {
    await conBarberia(e.A.barberia.id, async (db) => {
      expect(await db.customer.findUnique({ where: { id: e.B.cliente.id } })).toBeNull();
      expect(await db.customer.findFirst({ where: { id: e.B.cliente.id } })).toBeNull();
      expect(await db.customer.findUnique({ where: { cardToken: e.B.cliente.cardToken } })).toBeNull();
      expect(await db.barber.findUnique({ where: { id: e.B.barbero.id } })).toBeNull();
      expect(await db.barbershop.findUnique({ where: { id: e.B.barberia.id } })).toBeNull();
      expect(await db.barbershop.findUnique({ where: { slug: e.B.barberia.slug } })).toBeNull();
      expect(await db.ownerUser.findUnique({ where: { email: e.B.dueno.email } })).toBeNull();
    });
  });

  it("un filtro de barbería ajeno pasado por quien llama no devuelve nada", async () => {
    await conBarberia(e.A.barberia.id, async (db) => {
      expect(await db.customer.findMany({ where: { barbershopId: e.B.barberia.id } })).toEqual([]);
      expect(await db.customer.count({ where: { OR: [{ barbershopId: e.B.barberia.id }, { name: { contains: "Cliente" } }] } })).toBe(1);
    });
  });

  it("no puede modificar ni borrar filas de otra barbería", async () => {
    await expect(
      conBarberia(e.A.barberia.id, (db) => db.customer.update({ where: { id: e.B.cliente.id }, data: { name: "Hackeado" } })),
    ).rejects.toThrow();
    await expect(
      conBarberia(e.A.barberia.id, (db) => db.customer.delete({ where: { id: e.B.cliente.id } })),
    ).rejects.toThrow();
    await conBarberia(e.A.barberia.id, async (db) => {
      expect((await db.customer.updateMany({ where: { id: e.B.cliente.id }, data: { name: "Hackeado" } })).count).toBe(0);
      expect((await db.customer.deleteMany({ where: { id: e.B.cliente.id } })).count).toBe(0);
      expect((await db.barber.updateMany({ where: { id: e.B.barbero.id }, data: { active: false } })).count).toBe(0);
      expect((await db.barbershop.updateMany({ where: { id: e.B.barberia.id }, data: { name: "Hackeada" } })).count).toBe(0);
    });
    const intacto = await conBarberia(e.B.barberia.id, (db) => db.customer.findUnique({ where: { id: e.B.cliente.id } }));
    expect(intacto?.name).toBe("Cliente B");
  });

  it("no puede crear filas en otra barbería ni mover las suyas", async () => {
    await expect(
      conBarberia(e.A.barberia.id, (db) =>
        db.customer.create({
          data: { barbershopId: e.B.barberia.id, name: "Intruso", phone: "911111111", cardToken: tokenSeguro(), qrToken: tokenSeguro(), privacyAcceptedAt: new Date() },
        }),
      ),
    ).rejects.toThrow(/otra barbería/);
    await expect(
      conBarberia(e.A.barberia.id, (db) => db.customer.update({ where: { id: e.A.cliente.id }, data: { barbershopId: e.B.barberia.id } })),
    ).rejects.toThrow(/otra barbería/);
  });

  it("no puede tocar modelos globales sensibles ni crear barberías", async () => {
    await expect(conBarberia(e.A.barberia.id, (db) => db.superAdmin.findMany())).rejects.toThrow(/no es accesible/);
    await expect(conBarberia(e.A.barberia.id, (db) => db.session.findMany())).rejects.toThrow(/no es accesible/);
    await expect(conBarberia(e.A.barberia.id, (db) => db.plan.updateMany({ data: { priceMonthly: 0 } }))).rejects.toThrow(/no es accesible/);
    // Los planes sí se pueden leer (para mostrar límites y precios).
    expect((await conBarberia(e.A.barberia.id, (db) => db.plan.findMany())).length).toBe(1);
  });
});

describe("Capa 2: Row Level Security en PostgreSQL (aunque el código olvide el filtro)", () => {
  it("SQL crudo sin filtro solo ve la propia barbería", async () => {
    await conBarberia(e.A.barberia.id, async (db) => {
      for (const tabla of ["Customer", "Barber", "Stamp", "Redemption", "OwnerUser", "Payment", "AuditLog"]) {
        const filas = await db.$queryRawUnsafe<{ barbershopId: string }[]>(`SELECT "barbershopId" FROM "${tabla}"`);
        expect(filas.length, tabla).toBeGreaterThan(0);
        expect(filas.every((f) => f.barbershopId === e.A.barberia.id), tabla).toBe(true);
      }
      const barberias = await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Barbershop"`;
      expect(barberias.map((b) => b.id)).toEqual([e.A.barberia.id]);
    });
  });

  it("SQL crudo no puede modificar ni borrar filas ajenas", async () => {
    await conBarberia(e.A.barberia.id, async (db) => {
      expect(await db.$executeRaw`UPDATE "Customer" SET name = 'Hackeado' WHERE id = ${e.B.cliente.id}`).toBe(0);
      expect(await db.$executeRaw`DELETE FROM "Customer" WHERE id = ${e.B.cliente.id}`).toBe(0);
      expect(await db.$executeRaw`UPDATE "Barbershop" SET name = 'Hackeada' WHERE id = ${e.B.barberia.id}`).toBe(0);
      expect(await db.$executeRaw`UPDATE "Customer" SET "stampsCount" = 99`).toBe(1); // solo su único cliente
    });
    await conBarberia(e.A.barberia.id, (db) => db.customer.updateMany({ data: { stampsCount: 0 } }));
  });

  it("SQL crudo no puede insertar en otra barbería ni mover filas", async () => {
    await expect(
      conBarberia(e.A.barberia.id, (db) =>
        db.$executeRaw`INSERT INTO "Customer" (id, "barbershopId", name, phone, "cardToken", "qrToken", "privacyAcceptedAt")
                       VALUES (${tokenSeguro()}, ${e.B.barberia.id}, 'Intruso', '922222222', ${tokenSeguro()}, ${tokenSeguro()}, now())`),
    ).rejects.toThrow(/row-level security/);
    await expect(
      conBarberia(e.A.barberia.id, (db) =>
        db.$executeRaw`UPDATE "Customer" SET "barbershopId" = ${e.B.barberia.id} WHERE id = ${e.A.cliente.id}`),
    ).rejects.toThrow(/row-level security/);
  });

  it("las relaciones anidadas (include) tampoco cruzan barberías", async () => {
    const b = await conBarberia(e.A.barberia.id, (db) =>
      db.barbershop.findFirst({ include: { customers: true, barbers: true, stamps: true, plan: { include: { barbershops: true } } } }),
    );
    expect(b?.customers.every((c) => c.barbershopId === e.A.barberia.id)).toBe(true);
    // El plan es compartido, pero a través de él solo se ve la propia barbería.
    expect(b?.plan.barbershops.map((x) => x.id)).toEqual([e.A.barberia.id]);
  });

  it("una barbería no puede registrar ni alterar pagos (solo la plataforma)", async () => {
    await expect(
      conBarberia(e.A.barberia.id, (db) =>
        db.payment.create({ data: { barbershopId: e.A.barberia.id, amount: 1, method: "YAPE", paidAt: new Date(), periodStart: new Date(), periodEnd: new Date("2099-01-01") } }),
      ),
    ).rejects.toThrow();
    await conBarberia(e.A.barberia.id, async (db) => {
      expect((await db.payment.updateMany({ data: { amount: 0 } })).count).toBe(0);
      expect((await db.payment.deleteMany({})).count).toBe(0);
    });
  });

  it("la auditoría no se puede editar ni borrar, ni siquiera con acceso de plataforma", async () => {
    await expect(conPlataforma((db) => db.auditLog.updateMany({ data: { action: "x" } }))).rejects.toThrow(/permission denied/);
    await expect(conPlataforma((db) => db.auditLog.deleteMany({}))).rejects.toThrow(/permission denied/);
  });

  it("el contexto no se filtra entre transacciones consecutivas", async () => {
    await conBarberia(e.A.barberia.id, (db) => db.customer.count());
    expect(await prismaCrudo.customer.count()).toBe(0);
    await conPlataforma((db) => db.customer.count());
    expect(await prismaCrudo.customer.count()).toBe(0);
    expect(await conBarberia(e.B.barberia.id, (db) => db.customer.count())).toBe(1);
  });
});

describe("Capa 3: claves foráneas compuestas", () => {
  it("un sello de la barbería A no puede apuntar a un cliente de B (ni saltándose RLS)", async () => {
    await expect(
      dbDuenoTablas.stamp.create({ data: { barbershopId: e.A.barberia.id, customerId: e.B.cliente.id, localDate: "2026-01-11" } }),
    ).rejects.toThrow(/Foreign key/i);
    await expect(
      dbDuenoTablas.stamp.create({ data: { barbershopId: e.A.barberia.id, customerId: e.A.cliente.id, barberId: e.B.barbero.id, localDate: "2026-01-11" } }),
    ).rejects.toThrow(/Foreign key/i);
    await expect(
      dbDuenoTablas.redemption.create({ data: { barbershopId: e.A.barberia.id, customerId: e.B.cliente.id, stampsUsed: 5, rewardText: "x" } }),
    ).rejects.toThrow(/Foreign key/i);
  });
});

describe("Clientes independientes por barbería", () => {
  it("el mismo celular existe en ambas barberías con tarjetas separadas", async () => {
    expect(e.A.cliente.phone).toBe(e.B.cliente.phone);
    expect(e.A.cliente.cardToken).not.toBe(e.B.cliente.cardToken);
    expect(e.A.cliente.id).not.toBe(e.B.cliente.id);
  });

  it("el celular no se puede repetir dentro de la misma barbería", async () => {
    await expect(
      conBarberia(e.A.barberia.id, (db) =>
        db.customer.create({ data: { barbershopId: e.A.barberia.id, name: "Repetido", phone: e.A.cliente.phone, cardToken: tokenSeguro(), qrToken: tokenSeguro(), privacyAcceptedAt: new Date() } }),
      ),
    ).rejects.toThrow(/Unique constraint/);
  });
});

describe("Autorización de sesiones por barbería", () => {
  const futuro = new Date(Date.now() + 3_600_000);
  it("una sesión de dueño o barbero solo vale para su barbería", () => {
    const sesionA = { role: "DUENO" as const, barbershopId: "A", expiresAt: futuro };
    expect(sesionAutorizaBarberia(sesionA, "A", "DUENO")).toBe(true);
    expect(sesionAutorizaBarberia(sesionA, "B", "DUENO")).toBe(false);
    expect(sesionAutorizaBarberia(sesionA, "A", "BARBERO")).toBe(false);
    expect(sesionAutorizaBarberia({ role: "BARBERO", barbershopId: "A", expiresAt: futuro }, "B", "BARBERO")).toBe(false);
    expect(sesionAutorizaBarberia(null, "A", "DUENO")).toBe(false);
    expect(sesionAutorizaBarberia({ role: "DUENO", barbershopId: null, expiresAt: futuro }, "A", "DUENO")).toBe(false);
  });
  it("una sesión vencida no autoriza", () => {
    expect(sesionAutorizaBarberia({ role: "DUENO", barbershopId: "A", expiresAt: new Date(Date.now() - 1000) }, "A", "DUENO")).toBe(false);
  });
});
