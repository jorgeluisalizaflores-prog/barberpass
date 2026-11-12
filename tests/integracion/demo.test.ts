import { beforeAll, describe, expect, it } from "vitest";
import { ACTOR_SISTEMA } from "../../src/lib/auditoria";
import { conBarberia, conPlataforma } from "../../src/lib/db";
import { metricasGlobales } from "../../src/lib/servicios/admin";
import { autenticarBarbero, autenticarDueno } from "../../src/lib/servicios/autenticacion";
import { DEMO, obtenerDemo, reiniciarDemo } from "../../src/lib/servicios/demo";
import { clientesParaRecuperar, cumpleanosDelMes, obtenerMetricas } from "../../src/lib/servicios/panel";
import { crearEscenario } from "../ayudas";

describe("Barbería demo", () => {
  let id: string;
  beforeAll(async () => {
    await crearEscenario();
    await conPlataforma((db) => db.plan.create({ data: { name: "Pro", priceMonthly: 89, maxBarbers: 6 } }));
    id = (await reiniciarDemo(ACTOR_SISTEMA)).id;
  });

  it("tiene datos ficticios coherentes y listos para mostrar", async () => {
    const m = await obtenerMetricas(id);
    expect(m.clientes).toBe(60);
    expect(m.cortesMes).toBeGreaterThan(5);
    expect(m.canjesTotal).toBeGreaterThan(5);
    expect(m.porBarbero).toHaveLength(3);
    expect(m.porMes.filter((x) => x.valor > 0).length).toBeGreaterThanOrEqual(5);
    expect((await clientesParaRecuperar(id, 30)).length).toBeGreaterThan(3);
    expect((await cumpleanosDelMes(id)).clientes.length).toBeGreaterThan(1);
    // Los contadores guardados coinciden con el historial real.
    const clientes = await conBarberia(id, (db) => db.customer.findMany({ include: { stamps: true, redemptions: true } }));
    for (const c of clientes.filter((x) => x.phone !== DEMO.celularVitrina)) {
      expect(c.stampsCount, c.name).toBe(c.stamps.length - c.redemptions.length * 5);
      expect(c.stampsCount).toBeGreaterThanOrEqual(0);
    }
  });

  it("el cliente vitrina está a 1 corte de su recompensa", async () => {
    const demo = await obtenerDemo();
    const luis = await conBarberia(id, (db) => db.customer.findFirstOrThrow({ where: { cardToken: demo!.cardToken! } }));
    expect(luis).toMatchObject({ name: "Luis Ramírez", stampsCount: 4 });
  });

  it("permite ingresar con las credenciales de demostración", async () => {
    expect((await autenticarDueno(DEMO.email, "demo12345", "1.1.1.1")).ok).toBe(true);
    const carlos = await conBarberia(id, (db) => db.barber.findFirstOrThrow({ where: { name: "Carlos" } }));
    expect((await autenticarBarbero(id, carlos.id, DEMO.pinBarberos, "1.1.1.1")).ok).toBe(true);
  });

  it("no cuenta en las métricas de la plataforma y se puede regenerar", async () => {
    expect(await metricasGlobales()).toMatchObject({ total: 2, clientes: 2 });
    const otra = await reiniciarDemo(ACTOR_SISTEMA);
    expect(otra.id).not.toBe(id);
    expect(await conPlataforma((db) => db.barbershop.count({ where: { isDemo: true } }))).toBe(1);
    expect(await conPlataforma((db) => db.customer.count({ where: { barbershopId: id } }))).toBe(0);
  });
});
