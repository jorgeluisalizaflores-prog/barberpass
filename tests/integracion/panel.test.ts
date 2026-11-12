import { beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../../src/lib/auditoria";
import { conBarberia, conPlataforma, infraestructura } from "../../src/lib/db";
import { diaMesLima } from "../../src/lib/fechas";
import { autenticarBarbero } from "../../src/lib/servicios/autenticacion";
import { cambiarEstadoBarbero, cambiarPinBarbero, crearBarbero } from "../../src/lib/servicios/barberos";
import { registrarCliente } from "../../src/lib/servicios/clientes";
import { actualizarMarca, actualizarPrograma, guardarLogo } from "../../src/lib/servicios/marca";
import { clientesParaRecuperar, cumpleanosDelMes, exportarClientesCsv, listarClientes, obtenerMetricas } from "../../src/lib/servicios/panel";
import { canjearRecompensa, sumarSello } from "../../src/lib/servicios/sellos";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
let dueno: Actor;

beforeAll(async () => {
  e = await crearEscenario();
  dueno = { rol: "DUENO", id: e.A.dueno.id, nombre: "Dueño A", ip: "1.1.1.1" };
});

describe("Gestión de barberos y límite del plan", () => {
  it("permite crear hasta el máximo del plan (2) y luego lo impide", async () => {
    const segundo = await crearBarbero(e.A.barberia.id, { nombre: "Segundo", pin: "5678" }, dueno);
    expect(segundo.pinHash.startsWith("$argon2id$")).toBe(true);
    await expect(crearBarbero(e.A.barberia.id, { nombre: "Tercero", pin: "9999" }, dueno)).rejects.toMatchObject({ codigo: "LIMITE_PLAN" });
    // El límite es por barbería: B no se ve afectada por los barberos de A.
    await expect(crearBarbero(e.B.barberia.id, { nombre: "Otro B", pin: "1111" }, dueno)).resolves.toBeTruthy();
  });

  it("al desactivar un barbero se libera el cupo y se cierran sus sesiones", async () => {
    await infraestructura.session.create({ data: { tokenHash: "x1", role: "BARBERO", barberId: e.A.barbero.id, barbershopId: e.A.barberia.id, expiresAt: new Date(Date.now() + 1e6) } });
    await cambiarEstadoBarbero(e.A.barberia.id, e.A.barbero.id, false, dueno);
    expect(await infraestructura.session.count({ where: { barberId: e.A.barbero.id } })).toBe(0);
    expect((await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "1234", "1.1.1.1")).ok).toBe(false);
    const tercero = await crearBarbero(e.A.barberia.id, { nombre: "Tercero", pin: "9999" }, dueno);
    // Reactivar al primero excedería el plan.
    await expect(cambiarEstadoBarbero(e.A.barberia.id, e.A.barbero.id, true, dueno)).rejects.toMatchObject({ codigo: "LIMITE_PLAN" });
    await cambiarEstadoBarbero(e.A.barberia.id, tercero.id, false, dueno);
    await cambiarEstadoBarbero(e.A.barberia.id, e.A.barbero.id, true, dueno);
  });

  it("cambia el PIN y el anterior deja de servir", async () => {
    await cambiarPinBarbero(e.A.barberia.id, e.A.barbero.id, "246810", dueno);
    expect((await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "1234", "2.2.2.2")).ok).toBe(false);
    expect((await autenticarBarbero(e.A.barberia.id, e.A.barbero.id, "246810", "2.2.2.2")).ok).toBe(true);
    await expect(cambiarPinBarbero(e.A.barberia.id, e.A.barbero.id, "12", dueno)).rejects.toThrow();
  });

  it("el dueño de A no puede gestionar barberos de B", async () => {
    await expect(cambiarEstadoBarbero(e.A.barberia.id, e.B.barbero.id, false, dueno)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    await expect(cambiarPinBarbero(e.A.barberia.id, e.B.barbero.id, "0000", dueno)).rejects.toMatchObject({ codigo: "NO_ENCONTRADO" });
    expect((await autenticarBarbero(e.B.barberia.id, e.B.barbero.id, "1234", "3.3.3.3")).ok).toBe(true);
  });
});

describe("Marca y programa", () => {
  const marca = { name: "Barbería A Renovada", phone: "", address: "Av. Larco 123", city: "Miraflores", colorPrimary: "#0f766e", colorAccent: "#fde047", stampIcon: "NAVAJA", tagline: "Escanea y gana un corte gratis" };
  it("guarda la marca en la base de datos y valida los datos", async () => {
    await actualizarMarca(e.A.barberia.id, marca, dueno);
    const b = await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow());
    expect(b).toMatchObject({ name: "Barbería A Renovada", colorPrimary: "#0f766e", stampIcon: "NAVAJA" });
    await expect(actualizarMarca(e.A.barberia.id, { ...marca, colorPrimary: "rojo" }, dueno)).rejects.toThrow();
    await expect(actualizarMarca(e.A.barberia.id, { ...marca, stampIcon: "PEINE" }, dueno)).rejects.toThrow();
    // No cambió nada en B.
    expect((await conBarberia(e.B.barberia.id, (db) => db.barbershop.findFirstOrThrow())).name).toBe("Barbería B");
  });
  it("no deja colar campos de suscripción (plan, estado, vencimiento)", async () => {
    const antes = await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow());
    await actualizarMarca(e.A.barberia.id, { ...marca, status: "ACTIVA", paidUntil: new Date("2099-01-01"), isDemo: true, planId: "otro" }, dueno);
    const despues = await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow());
    expect(despues).toMatchObject({ status: antes.status, paidUntil: antes.paidUntil, isDemo: false, planId: antes.planId });
  });
  it("valida el programa de fidelidad", async () => {
    const prog = { stampsRequired: 6, rewardText: "Corte + barba gratis", welcomeStampEnabled: true, welcomeStamps: 1, inactivityDays: 45 };
    await actualizarPrograma(e.A.barberia.id, prog, dueno);
    expect(await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow())).toMatchObject(prog);
    await expect(actualizarPrograma(e.A.barberia.id, { ...prog, stampsRequired: 1 }, dueno)).rejects.toThrow();
    await expect(actualizarPrograma(e.A.barberia.id, { ...prog, stampsRequired: 2, welcomeStamps: 2 }, dueno)).rejects.toThrow();
    await actualizarPrograma(e.A.barberia.id, { ...prog, stampsRequired: 5, rewardText: "Corte gratis", inactivityDays: 30 }, dueno);
  });
  it("el logo se valida por su contenido real", async () => {
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
    await guardarLogo(e.A.barberia.id, png, dueno);
    expect(await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow())).toMatchObject({ logoMime: "image/png", logoVersion: 1 });
    await expect(guardarLogo(e.A.barberia.id, new TextEncoder().encode("<svg onload=alert(1)>"), dueno)).rejects.toMatchObject({ codigo: "LOGO" });
    await expect(guardarLogo(e.A.barberia.id, new Uint8Array(500 * 1024), dueno)).rejects.toMatchObject({ codigo: "LOGO" });
    await guardarLogo(e.A.barberia.id, null, dueno);
    expect((await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow())).logoMime).toBeNull();
  });
});

describe("Métricas, listas y exportación", () => {
  let barbero: Actor;
  beforeAll(async () => {
    barbero = { rol: "BARBERO", id: e.A.barbero.id, nombre: "Barbero A", ip: "1.1.1.1" };
    const { mes } = diaMesLima();
    // Cliente A original: 1 corte hoy. Nuevos: uno con cumpleaños este mes, otro inactivo.
    await sumarSello(e.A.barberia.id, { customerId: e.A.cliente.id, barberId: e.A.barbero.id, actor: barbero });
    await registrarCliente(e.A.barberia.id, { nombre: "Cumpleañero", celular: "911000001", cumpleDia: 15, cumpleMes: mes, aceptaPrivacidad: true, aceptaWhatsapp: true }, "1.1.1.1");
    await registrarCliente(e.A.barberia.id, { nombre: "=Inactivo Con Fórmula", celular: "911000002", aceptaPrivacidad: true, aceptaWhatsapp: true }, "1.1.1.1");
    await registrarCliente(e.A.barberia.id, { nombre: "Inactivo Sin Permiso", celular: "911000003", aceptaPrivacidad: true, aceptaWhatsapp: false }, "1.1.1.1");
    await dbDuenoTablas.$executeRaw`UPDATE "Customer" SET "createdAt" = now() - interval '40 days', "lastVisitAt" = now() - interval '35 days' WHERE phone IN ('911000002', '911000003')`;
    // Un canje (corte gratis) y actividad en B que NO debe contarse en A.
    await conBarberia(e.A.barberia.id, (db) => db.customer.updateMany({ where: { phone: "911000001" }, data: { stampsCount: 5 } }));
    const cumple = await conBarberia(e.A.barberia.id, (db) => db.customer.findFirstOrThrow({ where: { phone: "911000001" } }));
    await canjearRecompensa(e.A.barberia.id, { customerId: cumple.id, barberId: e.A.barbero.id, actor: barbero });
    await sumarSello(e.B.barberia.id, { customerId: e.B.cliente.id, barberId: e.B.barbero.id, actor: barbero });
  });

  it("calcula las métricas solo con datos de la propia barbería", async () => {
    const m = await obtenerMetricas(e.A.barberia.id);
    expect(m).toMatchObject({ clientes: 4, cortesSemana: 2, cortesMes: 2, canjesTotal: 1, canjesMes: 1, activos30: 2 });
    expect(m.porSemana).toHaveLength(8);
    expect(m.porSemana.at(-1)?.valor).toBe(2);
    expect(m.porMes).toHaveLength(6);
    expect(m.porMes.at(-1)?.valor).toBe(2);
    expect(m.porBarbero.find((b) => b.id === e.A.barbero.id)).toMatchObject({ cortes: 2, canjes: 1 });
    expect(m.porBarbero.some((b) => b.id === e.B.barbero.id)).toBe(false);
    expect(await obtenerMetricas(e.B.barberia.id)).toMatchObject({ clientes: 1, cortesMes: 1, canjesTotal: 0 });
  });

  it("clientes para recuperar: inactivos que SÍ aceptaron mensajes", async () => {
    const lista = await clientesParaRecuperar(e.A.barberia.id, 30);
    expect(lista.map((c) => c.phone)).toEqual(["911000002"]);
    expect(await clientesParaRecuperar(e.A.barberia.id, 60)).toHaveLength(0);
  });

  it("cumpleaños del mes", async () => {
    const { clientes } = await cumpleanosDelMes(e.A.barberia.id);
    expect(clientes.map((c) => c.name)).toEqual(["Cumpleañero"]);
    expect((await cumpleanosDelMes(e.B.barberia.id)).clientes).toHaveLength(0);
  });

  it("lista y busca clientes", async () => {
    expect((await listarClientes(e.A.barberia.id, "", 1)).total).toBe(4);
    expect((await listarClientes(e.A.barberia.id, "cumple", 1)).clientes.map((c) => c.phone)).toEqual(["911000001"]);
    expect((await listarClientes(e.A.barberia.id, "911000", 1)).total).toBe(3);
    expect((await listarClientes(e.A.barberia.id, "Cliente B", 1)).total).toBe(0);
  });

  it("el CSV solo contiene clientes propios, neutraliza fórmulas y queda auditado", async () => {
    const csv = await exportarClientesCsv(e.A.barberia.id, dueno);
    const lineas = csv.trim().split("\r\n");
    expect(lineas).toHaveLength(5);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain(`"'=Inactivo Con Fórmula"`);
    expect(csv).not.toContain("Cliente B");
    const log = await conPlataforma((db) => db.auditLog.findFirst({ where: { action: "clientes.exportar_csv" } }));
    expect(log).toMatchObject({ barbershopId: e.A.barberia.id, actorRole: "DUENO", detail: { cantidad: 4 } });
  });
});
