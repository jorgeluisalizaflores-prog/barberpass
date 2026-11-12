import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Actor } from "../../src/lib/auditoria";
import { hashSecreto } from "../../src/lib/auth/hash";
import { conBarberia, conPlataforma } from "../../src/lib/db";
import { fechaLocalLima } from "../../src/lib/fechas";
import { registrarCliente } from "../../src/lib/servicios/clientes";
import { buscarClientes, canjearRecompensa, sumarSello } from "../../src/lib/servicios/sellos";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
let actorA: Actor;
let opA: { customerId: string; barberId: string; actor: Actor };

/** Simula que pasaron días: mueve los sellos de hoy a una fecha anterior. */
async function envejecerSellos(customerId: string, dias: number) {
  const fecha = fechaLocalLima(new Date(Date.now() - dias * 86_400_000));
  await dbDuenoTablas.$executeRaw`UPDATE "Stamp" SET "localDate" = ${fecha}, "dailyKey" = CASE WHEN "dailyKey" IS NULL THEN NULL ELSE "customerId" || ':' || ${fecha} || ':' || id END WHERE "customerId" = ${customerId} AND "localDate" = ${fechaLocalLima()}`;
}

beforeAll(async () => {
  e = await crearEscenario();
  actorA = { rol: "BARBERO", id: e.A.barbero.id, nombre: e.A.barbero.name, ip: "1.1.1.1" };
  opA = { customerId: e.A.cliente.id, barberId: e.A.barbero.id, actor: actorA };
  const ownerPinHash = await hashSecreto("9876");
  await conBarberia(e.A.barberia.id, (db) => db.barbershop.update({ where: { id: e.A.barberia.id }, data: { ownerPinHash } }));
});
beforeEach(async () => { await dbDuenoTablas.loginAttempt.deleteMany({}); });

describe("Sumar sellos", () => {
  it("suma 1 sello, actualiza la tarjeta y deja auditoría", async () => {
    const r = await sumarSello(e.A.barberia.id, opA);
    expect(r.sellos).toBe(1);
    expect(r.tarjeta).toMatchObject({ sellosVisibles: 1, faltan: 4, recompensas: 0 });
    const log = await conPlataforma((db) => db.auditLog.findFirst({ where: { action: "sello.sumar" } }));
    expect(log).toMatchObject({ barbershopId: e.A.barberia.id, actorRole: "BARBERO", actorId: e.A.barbero.id, entityId: r.selloId });
    const cliente = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: e.A.cliente.id } }));
    expect(cliente.lastVisitAt).toBeInstanceOf(Date);
  });

  it("máximo 1 sello por cliente por día", async () => {
    await expect(sumarSello(e.A.barberia.id, opA)).rejects.toMatchObject({ codigo: "YA_SELLADO_HOY" });
    const cliente = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: e.A.cliente.id } }));
    expect(cliente.stampsCount).toBe(1);
  });

  it("dos sellos simultáneos (doble clic): solo entra uno", async () => {
    const { cardToken } = await registrarCliente(e.A.barberia.id, { nombre: "Doble Clic", celular: "911111111", aceptaPrivacidad: true }, "1.1.1.1");
    const c = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { cardToken } }));
    const r = await Promise.allSettled(Array.from({ length: 5 }, () => sumarSello(e.A.barberia.id, { ...opA, customerId: c.id })));
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    const despues = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: c.id } }));
    expect(despues.stampsCount).toBe(2); // bienvenida + 1 corte
  });

  it("el sello de bienvenida no impide el sello del primer corte el mismo día", async () => {
    const { cardToken } = await registrarCliente(e.A.barberia.id, { nombre: "Nuevo Hoy", celular: "922222222", aceptaPrivacidad: true }, "1.1.1.1");
    const c = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { cardToken } }));
    expect((await sumarSello(e.A.barberia.id, { ...opA, customerId: c.id })).sellos).toBe(2);
  });

  it("sello extra el mismo día: solo con el PIN del dueño", async () => {
    await expect(sumarSello(e.A.barberia.id, { ...opA, pinDueno: "0000" })).rejects.toMatchObject({ codigo: "PIN_INVALIDO" });
    const r = await sumarSello(e.A.barberia.id, { ...opA, pinDueno: "9876" });
    expect(r.sellos).toBe(2);
    const log = await conPlataforma((db) => db.auditLog.findFirst({ where: { action: "sello.sumar_extra" } }));
    expect(log?.detail).toMatchObject({ autorizadoConPinDueno: true });
  });

  it("al día siguiente vuelve a permitir un sello", async () => {
    await envejecerSellos(e.A.cliente.id, 1);
    expect((await sumarSello(e.A.barberia.id, opA)).sellos).toBe(3);
  });

  it("un barbero no puede sellar a un cliente de otra barbería", async () => {
    await expect(sumarSello(e.A.barberia.id, { ...opA, customerId: e.B.cliente.id })).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    const b = await conBarberia(e.B.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: e.B.cliente.id } }));
    expect(b.stampsCount).toBe(0);
  });
});

describe("Canjear recompensas", () => {
  it("no se puede canjear sin sellos suficientes", async () => {
    await expect(canjearRecompensa(e.A.barberia.id, opA)).rejects.toMatchObject({ codigo: "SIN_RECOMPENSA" });
  });

  it("al completar la tarjeta avisa de la recompensa; canjear reinicia el contador", async () => {
    await envejecerSellos(e.A.cliente.id, 2);
    await sumarSello(e.A.barberia.id, opA); // 4
    await envejecerSellos(e.A.cliente.id, 3);
    const quinto = await sumarSello(e.A.barberia.id, opA); // 5
    expect(quinto.tarjeta).toMatchObject({ recompensas: 1, sellosVisibles: 5 });

    const canje = await canjearRecompensa(e.A.barberia.id, opA);
    expect(canje.sellos).toBe(0);
    expect(canje.tarjeta.recompensas).toBe(0);
    const cliente = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: e.A.cliente.id } }));
    expect(cliente).toMatchObject({ stampsCount: 0, totalStamps: 5, totalRedemptions: 1 });
    const log = await conPlataforma((db) => db.auditLog.findFirst({ where: { action: "recompensa.canjear" } }));
    expect(log).toMatchObject({ barbershopId: e.A.barberia.id, actorId: e.A.barbero.id });
  });

  it("dos canjes simultáneos: solo uno tiene éxito", async () => {
    await conBarberia(e.A.barberia.id, (db) => db.customer.update({ where: { id: e.A.cliente.id }, data: { stampsCount: 5 } }));
    const r = await Promise.allSettled([canjearRecompensa(e.A.barberia.id, opA), canjearRecompensa(e.A.barberia.id, opA), canjearRecompensa(e.A.barberia.id, opA)]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });

  it("no puede canjear la recompensa de un cliente de otra barbería", async () => {
    await conBarberia(e.B.barberia.id, (db) => db.customer.update({ where: { id: e.B.cliente.id }, data: { stampsCount: 5 } }));
    await expect(canjearRecompensa(e.A.barberia.id, { ...opA, customerId: e.B.cliente.id })).rejects.toMatchObject({ codigo: "SIN_RECOMPENSA" });
    const b = await conBarberia(e.B.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { id: e.B.cliente.id } }));
    expect(b.stampsCount).toBe(5);
  });
});

describe("Búsqueda de clientes", () => {
  it("busca por celular o por nombre, solo en la propia barbería", async () => {
    expect((await buscarClientes(e.A.barberia.id, "98765")).map((c) => c.id)).toEqual([e.A.cliente.id]);
    expect((await buscarClientes(e.A.barberia.id, "cliente a")).map((c) => c.id)).toEqual([e.A.cliente.id]);
    expect(await buscarClientes(e.A.barberia.id, "Cliente B")).toEqual([]);
    expect(await buscarClientes(e.A.barberia.id, "x")).toEqual([]);
  });
});
