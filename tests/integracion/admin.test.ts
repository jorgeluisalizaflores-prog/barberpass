import { beforeAll, describe, expect, it } from "vitest";
import type { Actor } from "../../src/lib/auditoria";
import { conBarberia, conPlataforma, infraestructura } from "../../src/lib/db";
import {
  detalleBarberia, editarBarberia, guardarConfiguracion, guardarPlan, listarAuditoria, listarBarberias, metricasGlobales,
  reactivarBarberia, registrarImpersonacion, registrarPago, restablecerPasswordDueno, suspenderBarberia,
} from "../../src/lib/servicios/admin";
import { autenticarDueno, guardarSuperAdmin } from "../../src/lib/servicios/autenticacion";
import { calcularSuscripcion } from "../../src/lib/suscripcion/estado";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
let admin: Actor;
const dueno: Actor = { rol: "DUENO", id: "x", nombre: "Dueño" };
const CFG = { graceDays: 5, expiringNoticeDays: 7 };
const dia = 86_400_000;

beforeAll(async () => {
  e = await crearEscenario();
  const a = await guardarSuperAdmin("admin@prueba.test", "Admin", "super-clave-123");
  admin = { rol: "SUPER_ADMIN", id: a.id, nombre: a.name, ip: "9.9.9.9" };
});

describe("Solo el super administrador", () => {
  it("un dueño o barbero no puede ejecutar servicios de administración", async () => {
    const pago = { monto: 49, metodo: "YAPE", fecha: new Date(), meses: 1 };
    await expect(registrarPago(e.A.barberia.id, pago, dueno)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(suspenderBarberia(e.B.barberia.id, "x", dueno)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(registrarImpersonacion(e.B.barberia.id, dueno)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
    await expect(guardarPlan(null, { name: "Gratis", priceMonthly: 0, maxBarbers: "", maxCustomers: "" }, dueno)).rejects.toMatchObject({ codigo: "PROHIBIDO" });
  });
});

describe("Pagos manuales y vencimiento", () => {
  it("un pago durante la prueba activa la barbería y extiende desde el fin de la prueba", async () => {
    const antes = await detalleBarberia(e.A.barberia.id);
    const pago = await registrarPago(e.A.barberia.id, { monto: "49.00", metodo: "YAPE", fecha: new Date(), meses: 1, nota: "Op. 123" }, admin);
    expect(pago.periodStart.getTime()).toBe(antes!.trialEndsAt.getTime());
    const despues = await detalleBarberia(e.A.barberia.id);
    expect(despues).toMatchObject({ status: "ACTIVA" });
    expect(despues!.paidUntil!.getTime()).toBe(pago.periodEnd.getTime());
    expect(despues!.suscripcion.estado).toBe("ACTIVA");
    expect(Number(pago.amount)).toBe(49);
    expect(pago.recordedById).toBe(admin.id);
  });

  it("un segundo pago se acumula a continuación del período vigente", async () => {
    const antes = await detalleBarberia(e.A.barberia.id);
    const pago = await registrarPago(e.A.barberia.id, { monto: 147, metodo: "TRANSFERENCIA", fecha: new Date(), meses: 3 }, admin);
    expect(pago.periodStart.getTime()).toBe(antes!.paidUntil!.getTime());
    expect(pago.months).toBe(3);
  });

  it("una barbería vencida y bloqueada se desbloquea al registrar el pago, desde la fecha de pago", async () => {
    await dbDuenoTablas.barbershop.update({ where: { id: e.B.barberia.id }, data: { trialEndsAt: new Date(Date.now() - 20 * dia) } });
    let b = await detalleBarberia(e.B.barberia.id);
    expect(b!.suscripcion).toMatchObject({ estado: "VENCIDA", bloqueada: true });
    const hoy = new Date();
    const pago = await registrarPago(e.B.barberia.id, { monto: 49, metodo: "PLIN", fecha: hoy, meses: 1 }, admin);
    expect(pago.periodStart.getTime()).toBe(hoy.getTime());
    b = await detalleBarberia(e.B.barberia.id);
    expect(b!.suscripcion).toMatchObject({ estado: "ACTIVA", bloqueada: false });
    // No se borró ningún dato durante el bloqueo.
    expect(b!._count.customers).toBe(1);
  });

  it("valida monto, meses y fecha", async () => {
    await expect(registrarPago(e.A.barberia.id, { monto: 0, metodo: "YAPE", fecha: new Date(), meses: 1 }, admin)).rejects.toThrow();
    await expect(registrarPago(e.A.barberia.id, { monto: 49, metodo: "BITCOIN", fecha: new Date(), meses: 1 }, admin)).rejects.toThrow();
    await expect(registrarPago(e.A.barberia.id, { monto: 49, metodo: "YAPE", fecha: new Date(Date.now() + 5 * dia), meses: 1 }, admin)).rejects.toMatchObject({ codigo: "FECHA" });
  });

  it("cada pago queda en la auditoría con usuario, fecha y período", async () => {
    const { filas } = await listarAuditoria({ accion: "pago." });
    expect(filas).toHaveLength(3);
    expect(filas[0]).toMatchObject({ actorRole: "SUPER_ADMIN", actorId: admin.id, action: "pago.registrar", ip: "9.9.9.9" });
    expect(filas[0].detail).toHaveProperty("periodoHasta");
    expect(filas[0].createdAt).toBeInstanceOf(Date);
  });
});

describe("Suspender y reactivar", () => {
  it("suspender bloquea, cierra sesiones y conserva los datos; reactivar restaura", async () => {
    await infraestructura.session.create({ data: { tokenHash: "sesion-dueno-a", role: "DUENO", ownerUserId: e.A.dueno.id, barbershopId: e.A.barberia.id, expiresAt: new Date(Date.now() + dia) } });
    await suspenderBarberia(e.A.barberia.id, "Falta de pago reiterada", admin);
    let b = await detalleBarberia(e.A.barberia.id);
    expect(b!.suscripcion).toMatchObject({ estado: "SUSPENDIDA", bloqueada: true });
    expect(b!.suspendedNote).toBe("Falta de pago reiterada");
    expect(await infraestructura.session.count({ where: { barbershopId: e.A.barberia.id } })).toBe(0);
    expect(await conBarberia(e.A.barberia.id, (db) => db.customer.count())).toBe(1);

    await reactivarBarberia(e.A.barberia.id, admin);
    b = await detalleBarberia(e.A.barberia.id);
    expect(b).toMatchObject({ status: "ACTIVA", suspendedNote: "" });
    expect(b!.suscripcion.bloqueada).toBe(false);
  });
});

describe("Listado, métricas y planes", () => {
  it("lista las barberías con su estado y permite filtrar", async () => {
    expect((await listarBarberias()).map((b) => b.slug).sort()).toEqual(["barberia-a", "barberia-b"]);
    expect(await listarBarberias({ estado: "ACTIVA" })).toHaveLength(2);
    expect(await listarBarberias({ estado: "SUSPENDIDA" })).toHaveLength(0);
    expect((await listarBarberias({ q: "dueno-b@" })).map((b) => b.slug)).toEqual(["barberia-b"]);
  });

  it("calcula MRR, ingresos y barberías por vencer", async () => {
    const m = await metricasGlobales();
    expect(m).toMatchObject({ total: 2, activas: 2, enPrueba: 0, mrr: 98, ingresosMes: 245, clientes: 2 });
    // B vence en ~1 mes: no está "por vencer"; dentro de 26 días sí.
    expect(m.porVencer).toHaveLength(0);
    const futuro = await metricasGlobales(new Date(Date.now() + 26 * dia));
    expect(futuro.porVencer.map((b) => b.slug)).toEqual(["barberia-b"]);
  });

  it("la barbería demo no cuenta en las métricas ni vence", async () => {
    await dbDuenoTablas.barbershop.update({ where: { id: e.B.barberia.id }, data: { isDemo: true } });
    expect(await metricasGlobales()).toMatchObject({ total: 1, mrr: 49, clientes: 1 });
    await expect(registrarPago(e.B.barberia.id, { monto: 49, metodo: "YAPE", fecha: new Date(), meses: 1 }, admin)).rejects.toMatchObject({ codigo: "DEMO" });
    await dbDuenoTablas.barbershop.update({ where: { id: e.B.barberia.id }, data: { isDemo: false } });
  });

  it("crea y edita planes; el límite de barberos se aplica al cambiar de plan", async () => {
    const plan = await guardarPlan(null, { name: "Premium", priceMonthly: "149", maxBarbers: "", maxCustomers: "", active: true }, admin);
    expect(plan.maxBarbers).toBeNull();
    await expect(guardarPlan(null, { name: "Premium", priceMonthly: 1, maxBarbers: "", maxCustomers: "" }, admin)).rejects.toMatchObject({ codigo: "PLAN_REPETIDO" });
    const editado = await guardarPlan(plan.id, { name: "Premium", priceMonthly: "159.90", maxBarbers: "10", maxCustomers: "", active: true }, admin);
    expect(Number(editado.priceMonthly)).toBe(159.9);
    expect(editado.maxBarbers).toBe(10);

    const b = await detalleBarberia(e.A.barberia.id);
    await editarBarberia(e.A.barberia.id, { name: b!.name, slug: b!.slug, planId: plan.id, phone: "", city: "Lima", trialEndsAt: b!.trialEndsAt }, admin);
    expect((await metricasGlobales()).mrr).toBeCloseTo(159.9 + 49);
    await expect(editarBarberia(e.A.barberia.id, { name: "X2", slug: "barberia-b", planId: plan.id, phone: "", city: "", trialEndsAt: new Date() }, admin)).rejects.toMatchObject({ codigo: "SLUG_EN_USO" });
  });

  it("la configuración cambia las reglas de gracia", async () => {
    await guardarConfiguracion({ trialDays: 30, graceDays: 0, expiringNoticeDays: 3, contactWhatsapp: "987654321", basePrivacyPolicy: "" }, admin);
    const cfg = await conPlataforma((db) => db.platformSettings.findUniqueOrThrow({ where: { id: 1 } }));
    expect(cfg).toMatchObject({ trialDays: 30, graceDays: 0, contactWhatsapp: "987654321" });
    const vencida = { status: "PRUEBA" as const, trialEndsAt: new Date(Date.now() - dia), paidUntil: null, isDemo: false };
    expect(calcularSuscripcion(vencida, cfg).bloqueada).toBe(true);
    expect(calcularSuscripcion(vencida, CFG).bloqueada).toBe(false);
  });
});

describe("Soporte", () => {
  it("la impersonación queda registrada con el super administrador que la hizo", async () => {
    const b = await registrarImpersonacion(e.B.barberia.id, admin);
    expect(b.slug).toBe("barberia-b");
    const { filas } = await listarAuditoria({ accion: "admin.impersonar" });
    expect(filas[0]).toMatchObject({ barbershopId: e.B.barberia.id, actorRole: "SUPER_ADMIN", actorId: admin.id, impersonatorId: admin.id, barberia: "Barbería B" });
  });

  it("restablece la contraseña del dueño y cierra sus sesiones", async () => {
    await dbDuenoTablas.loginAttempt.deleteMany({});
    await restablecerPasswordDueno(e.B.dueno.id, "nueva-clave-456", admin);
    expect((await autenticarDueno(e.B.dueno.email, e.B.password, "1.1.1.1")).ok).toBe(false);
    expect((await autenticarDueno(e.B.dueno.email, "nueva-clave-456", "1.1.1.1")).ok).toBe(true);
  });

  it("la auditoría se puede filtrar por barbería", async () => {
    const r = await listarAuditoria({ barbershopId: e.A.barberia.id });
    expect(r.filas.length).toBeGreaterThan(3);
    expect(r.filas.every((f) => f.barbershopId === e.A.barberia.id)).toBe(true);
  });
});
