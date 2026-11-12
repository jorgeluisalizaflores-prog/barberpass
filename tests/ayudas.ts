// Utilidades de las pruebas: limpiar la base y armar un escenario con DOS
// barberías (A y B) con sus propios barberos y clientes.
import { PrismaClient } from "@prisma/client";
import { ACTOR_SISTEMA } from "../src/lib/auditoria";
import { hashSecreto } from "../src/lib/auth/hash";
import { conBarberia, conPlataforma } from "../src/lib/db";
import { crearBarberia } from "../src/lib/servicios/barberias";
import { tokenSeguro } from "../src/lib/tokens";

/** Conexión con el rol dueño de las tablas (se salta RLS): solo para preparar y limpiar. */
export const dbDuenoTablas = new PrismaClient({ datasourceUrl: process.env.DIRECT_URL });

export async function limpiarBase(): Promise<void> {
  await dbDuenoTablas.$executeRawUnsafe(
    'TRUNCATE "AuditLog","Payment","Redemption","Stamp","Customer","Barber","OwnerUser","Barbershop","Plan","PlatformSettings","Session","LoginAttempt","SuperAdmin" CASCADE',
  );
}

export async function crearPlan(maxBarbers: number | null = 2) {
  return conPlataforma((db) =>
    db.plan.create({ data: { name: `Plan ${tokenSeguro(4)}`, priceMonthly: 49, maxBarbers } }),
  );
}

export async function crearBarberiaDePrueba(letra: string, planId: string) {
  const slug = `barberia-${letra.toLowerCase()}`;
  const barberia = await conPlataforma((db) =>
    crearBarberia(db, {
      nombre: `Barbería ${letra}`, slug, planId,
      dueno: { nombre: `Dueño ${letra}`, email: `dueno-${letra.toLowerCase()}@prueba.test`, password: `clave-de-${letra}-123` },
    }, ACTOR_SISTEMA),
  );
  const pinHash = await hashSecreto("1234");
  const { barbero, cliente } = await conBarberia(barberia.id, async (db) => {
    const barbero = await db.barber.create({ data: { barbershopId: barberia.id, name: `Barbero ${letra}`, pinHash } });
    const cliente = await db.customer.create({
      data: {
        barbershopId: barberia.id, name: `Cliente ${letra}`, phone: "987654321",
        cardToken: tokenSeguro(), qrToken: tokenSeguro(), privacyAcceptedAt: new Date(), whatsappOptIn: true,
      },
    });
    return { barbero, cliente };
  });
  return { barberia, dueno: barberia.owners[0], barbero, cliente, password: `clave-de-${letra}-123` };
}

export type Escenario = Awaited<ReturnType<typeof crearEscenario>>;

export async function crearEscenario() {
  await limpiarBase();
  await conPlataforma((db) => db.platformSettings.create({ data: { id: 1 } }));
  const plan = await crearPlan(2);
  const A = await crearBarberiaDePrueba("A", plan.id);
  const B = await crearBarberiaDePrueba("B", plan.id);
  return { plan, A, B };
}
