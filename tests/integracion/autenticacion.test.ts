import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { hashSecreto, verificarSecreto } from "../../src/lib/auth/hash";
import { conBarberia, conPlataforma } from "../../src/lib/db";
import { autenticarBarbero, autenticarDueno, autenticarSuperAdmin, guardarSuperAdmin, verificarPinDueno } from "../../src/lib/servicios/autenticacion";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
beforeAll(async () => {
  e = await crearEscenario();
  await guardarSuperAdmin("admin@prueba.test", "Admin", "super-clave-123");
});
beforeEach(async () => {
  await dbDuenoTablas.loginAttempt.deleteMany({});
});

describe("Hash de secretos", () => {
  it("nunca guarda contraseñas ni PINs en texto plano", async () => {
    const duenos = await conPlataforma((db) => db.ownerUser.findMany());
    const barberos = await conPlataforma((db) => db.barber.findMany());
    const admins = await conPlataforma((db) => db.superAdmin.findMany());
    for (const h of [...duenos.map((d) => d.passwordHash), ...barberos.map((b) => b.pinHash), ...admins.map((a) => a.passwordHash)]) {
      expect(h.startsWith("$argon2id$")).toBe(true);
    }
  });
  it("verifica correctamente", async () => {
    const h = await hashSecreto("1234");
    expect(await verificarSecreto(h, "1234")).toBe(true);
    expect(await verificarSecreto(h, "1235")).toBe(false);
    expect(await verificarSecreto(null, "1234")).toBe(false);
  });
});

describe("Inicio de sesión del dueño", () => {
  it("acepta credenciales correctas y devuelve SU barbería", async () => {
    const r = await autenticarDueno(e.A.dueno.email, e.A.password, "1.1.1.1");
    expect(r).toMatchObject({ ok: true, barbershopId: e.A.barberia.id, slug: "barberia-a" });
  });
  it("rechaza contraseña incorrecta y correo inexistente con el mismo mensaje", async () => {
    const mala = await autenticarDueno(e.A.dueno.email, "incorrecta", "1.1.1.1");
    const inexistente = await autenticarDueno("nadie@prueba.test", "incorrecta", "1.1.1.1");
    expect(mala.ok).toBe(false);
    expect(inexistente).toEqual(mala);
  });
  it("bloquea tras 5 intentos fallidos, incluso con la contraseña correcta", async () => {
    for (let i = 0; i < 5; i++) await autenticarDueno(e.A.dueno.email, "incorrecta", `2.2.2.${i}`);
    const r = await autenticarDueno(e.A.dueno.email, e.A.password, "9.9.9.9");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Demasiados intentos/);
    // Otra cuenta no queda afectada.
    expect((await autenticarDueno(e.B.dueno.email, e.B.password, "9.9.9.9")).ok).toBe(true);
  });
  it("bloquea por IP tras 20 fallos repartidos en varias cuentas", async () => {
    for (let i = 0; i < 20; i++) await autenticarDueno(`cuenta${i}@prueba.test`, "incorrecta", "3.3.3.3");
    const r = await autenticarDueno(e.A.dueno.email, e.A.password, "3.3.3.3");
    expect(r.ok).toBe(false);
    expect((await autenticarDueno(e.A.dueno.email, e.A.password, "4.4.4.4")).ok).toBe(true);
  });
});

describe("Inicio de sesión del super administrador", () => {
  it("acepta y rechaza según la contraseña", async () => {
    expect((await autenticarSuperAdmin("admin@prueba.test", "super-clave-123", "1.1.1.1")).ok).toBe(true);
    expect((await autenticarSuperAdmin("admin@prueba.test", "otra", "1.1.1.1")).ok).toBe(false);
    // Un dueño no puede entrar como super administrador.
    expect((await autenticarSuperAdmin(e.A.dueno.email, e.A.password, "1.1.1.1")).ok).toBe(false);
  });
});

describe("PIN del barbero", () => {
  it("acepta el PIN correcto en su barbería", async () => {
    expect((await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "1234", "1.1.1.1")).ok).toBe(true);
  });
  it("un barbero de otra barbería no puede ingresar aquí aunque el PIN coincida", async () => {
    expect((await autenticarBarbero(e.A.barberia.id, e.B.barbero.id, "1234", "1.1.1.1")).ok).toBe(false);
  });
  it("un barbero desactivado no puede ingresar", async () => {
    await conBarberia(e.B.barberia.id, (db) => db.barber.update({ where: { id: e.B.barbero.id }, data: { active: false } }));
    expect((await autenticarBarbero(e.B.barberia.id, e.B.barbero.id, "1234", "1.1.1.1")).ok).toBe(false);
    await conBarberia(e.B.barberia.id, (db) => db.barber.update({ where: { id: e.B.barbero.id }, data: { active: true } }));
  });
  it("bloquea el PIN tras 5 intentos fallidos", async () => {
    for (let i = 0; i < 5; i++) expect((await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "0000", "5.5.5.5")).ok).toBe(false);
    const r = await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "1234", "6.6.6.6");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Demasiados intentos/);
  });
});

describe("PIN de autorización del dueño", () => {
  it("valida el PIN y limita los intentos", async () => {
    expect((await verificarPinDueno(e.A.barberia.id, "4321", "1.1.1.1")).ok).toBe(false); // aún sin configurar
    const ownerPinHash = await hashSecreto("4321");
    await conBarberia(e.A.barberia.id, (db) => db.barbershop.update({ where: { id: e.A.barberia.id }, data: { ownerPinHash } }));
    expect((await verificarPinDueno(e.A.barberia.id, "4321", "1.1.1.1")).ok).toBe(true);
    // El PIN de A no sirve en B.
    expect((await verificarPinDueno(e.B.barberia.id, "4321", "1.1.1.1")).ok).toBe(false);
    for (let i = 0; i < 5; i++) await verificarPinDueno(e.A.barberia.id, "0000", "1.1.1.1");
    expect((await verificarPinDueno(e.A.barberia.id, "4321", "1.1.1.1")).ok).toBe(false);
  });
});
