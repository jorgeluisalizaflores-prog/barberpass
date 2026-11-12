import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { conBarberia, conPlataforma } from "../../src/lib/db";
import { obtenerTarjeta, registrarCliente } from "../../src/lib/servicios/clientes";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
const BASE = { nombre: "Luis Ramírez", celular: "912345678", aceptaPrivacidad: true, aceptaWhatsapp: true };

beforeAll(async () => { e = await crearEscenario(); });
beforeEach(async () => { await dbDuenoTablas.loginAttempt.deleteMany({}); });

describe("Registro de clientes", () => {
  it("crea la tarjeta con token difícil de adivinar y sello de bienvenida", async () => {
    const { cardToken } = await registrarCliente(e.A.barberia.id, { ...BASE, cumpleDia: 5, cumpleMes: 8 }, "1.1.1.1");
    expect(cardToken).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const t = await obtenerTarjeta(e.A.barberia.id, cardToken);
    expect(t?.cliente).toMatchObject({ name: "Luis Ramírez", stampsCount: 1 });
    expect(t?.historial).toHaveLength(1);
    expect(t?.historial[0]).toMatchObject({ tipo: "BIENVENIDA", cantidad: 1, barbero: null });
    const fila = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirst({ where: { phone: "912345678" } }));
    expect(fila).toMatchObject({ birthDay: 5, birthMonth: 8, whatsappOptIn: true });
    expect(fila?.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(fila?.whatsappOptInAt).toBeInstanceOf(Date);
  });

  it("no permite duplicar el celular en la misma barbería", async () => {
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, nombre: "Otro" }, "1.1.1.1")).rejects.toThrow(/ya tiene una tarjeta/);
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, celular: "+51 912 345 678" }, "1.1.1.1")).rejects.toThrow(/ya tiene una tarjeta/);
  });

  it("el mismo celular puede registrarse en otra barbería con una tarjeta distinta", async () => {
    const enB = await registrarCliente(e.B.barberia.id, BASE, "1.1.1.1");
    const enA = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { phone: "912345678" } }));
    expect(enB.cardToken).not.toBe(enA.cardToken);
    // La tarjeta de B no se puede abrir bajo la barbería A, ni al revés.
    expect(await obtenerTarjeta(e.A.barberia.id, enB.cardToken)).toBeNull();
    expect(await obtenerTarjeta(e.B.barberia.id, enA.cardToken)).toBeNull();
    expect(await obtenerTarjeta(e.B.barberia.id, enB.cardToken)).not.toBeNull();
  });

  it("exige aceptar la política de privacidad y valida el celular en el servidor", async () => {
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, celular: "911111111", aceptaPrivacidad: false }, "1.1.1.1")).rejects.toThrow();
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, celular: "812345678" }, "1.1.1.1")).rejects.toThrow();
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, celular: "91234" }, "1.1.1.1")).rejects.toThrow();
  });

  it("respeta la configuración del sello de bienvenida", async () => {
    await conBarberia(e.B.barberia.id, (db) => db.barbershop.update({ where: { id: e.B.barberia.id }, data: { welcomeStampEnabled: false } }));
    const { cardToken } = await registrarCliente(e.B.barberia.id, { ...BASE, celular: "933333333", aceptaWhatsapp: false }, "1.1.1.1");
    const t = await obtenerTarjeta(e.B.barberia.id, cardToken);
    expect(t?.cliente.stampsCount).toBe(0);
    expect(t?.historial).toHaveLength(0);
  });

  it("deja registro de auditoría del consentimiento", async () => {
    const logs = await conPlataforma((db) => db.auditLog.findMany({ where: { action: "cliente.registrar", barbershopId: e.A.barberia.id } }));
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ actorRole: "CLIENTE", ip: "1.1.1.1" });
  });

  it("frena los registros masivos desde una misma IP", async () => {
    for (let i = 0; i < 10; i++) await registrarCliente(e.A.barberia.id, { ...BASE, celular: `94000000${i}` }, "7.7.7.7");
    await expect(registrarCliente(e.A.barberia.id, { ...BASE, celular: "940000099" }, "7.7.7.7")).rejects.toThrow(/demasiados registros/i);
  });

  it("respeta el máximo de clientes del plan", async () => {
    await conPlataforma((db) => db.plan.update({ where: { id: e.plan.id }, data: { maxCustomers: 1 } }));
    await expect(registrarCliente(e.B.barberia.id, { ...BASE, celular: "955555555" }, "8.8.8.8")).rejects.toThrow(/máximo de clientes/);
    await conPlataforma((db) => db.plan.update({ where: { id: e.plan.id }, data: { maxCustomers: null } }));
  });
});
