import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { conBarberia, conPlataforma, infraestructura } from "../../src/lib/db";
import { autenticarDueno } from "../../src/lib/servicios/autenticacion";
import { restablecerConToken, solicitarRecuperacion, tokenRecuperacionValido } from "../../src/lib/servicios/recuperacion";
import { completarOnboarding, registrarBarberiaPublica } from "../../src/lib/servicios/registro";
import { calcularSuscripcion } from "../../src/lib/suscripcion/estado";
import { crearEscenario, dbDuenoTablas, type Escenario } from "../ayudas";

let e: Escenario;
const ALTA = { nombreBarberia: "Barbería El Bigote", nombreDueno: "Juan Pérez", email: "Juan@Bigote.test", password: "bigote-123", aceptaTerminos: true };

beforeAll(async () => { e = await crearEscenario(); });
beforeEach(async () => { await dbDuenoTablas.loginAttempt.deleteMany({}); });

describe("Registro público de barberías", () => {
  it("crea la barbería en prueba gratis de 14 días con marca y textos por defecto", async () => {
    const r = await registrarBarberiaPublica(ALTA, "1.1.1.1");
    expect(r.slug).toBe("barberia-el-bigote");
    const b = await conBarberia(r.barbershopId, (db) => db.barbershop.findFirstOrThrow({ include: { owners: true } }));
    expect(b).toMatchObject({ status: "PRUEBA", stampsRequired: 5, rewardText: "Corte gratis", planId: e.plan.id, onboardingCompletedAt: null });
    expect(b.owners[0].email).toBe("juan@bigote.test");
    expect(b.privacyPolicy).toContain("Ley N.° 29733");
    expect(b.privacyPolicy).toContain("Barbería El Bigote");
    const s = calcularSuscripcion(b, { graceDays: 5, expiringNoticeDays: 7 });
    expect(s).toMatchObject({ estado: "PRUEBA", diasRestantes: 14, bloqueada: false });
    expect((await autenticarDueno("juan@bigote.test", "bigote-123", "1.1.1.1")).ok).toBe(true);
  });

  it("genera una dirección única si el nombre se repite y rechaza correos repetidos", async () => {
    const r = await registrarBarberiaPublica({ ...ALTA, email: "otro@bigote.test" }, "1.1.1.2");
    expect(r.slug).toBe("barberia-el-bigote-2");
    await expect(registrarBarberiaPublica(ALTA, "1.1.1.3")).rejects.toMatchObject({ codigo: "EMAIL_EN_USO" });
  });

  it("nombres que chocan con rutas reservadas reciben un slug seguro", async () => {
    const r = await registrarBarberiaPublica({ ...ALTA, nombreBarberia: "Admin", email: "admin-barber@prueba.test" }, "1.1.1.4");
    expect(r.slug).toBe("barberia-admin");
  });

  it("valida contraseña, términos y no acepta planes inactivos", async () => {
    await expect(registrarBarberiaPublica({ ...ALTA, email: "a@b.test", password: "corta" }, "2.2.2.2")).rejects.toThrow();
    await expect(registrarBarberiaPublica({ ...ALTA, email: "a@b.test", aceptaTerminos: false }, "2.2.2.2")).rejects.toThrow();
    const oculto = await conPlataforma((db) => db.plan.create({ data: { name: "Interno gratis", priceMonthly: 0, active: false } }));
    const r = await registrarBarberiaPublica({ ...ALTA, nombreBarberia: "Plan Trampa", email: "trampa@prueba.test", planId: oculto.id }, "2.2.2.3");
    const b = await conBarberia(r.barbershopId, (db) => db.barbershop.findFirstOrThrow());
    expect(b.planId).toBe(e.plan.id);
  });

  it("limita las altas por IP", async () => {
    for (let i = 0; i < 3; i++) await registrarBarberiaPublica({ ...ALTA, nombreBarberia: `Spam ${i}`, email: `spam${i}@prueba.test` }, "6.6.6.6");
    await expect(registrarBarberiaPublica({ ...ALTA, nombreBarberia: "Spam 4", email: "spam4@prueba.test" }, "6.6.6.6")).rejects.toMatchObject({ codigo: "LIMITE" });
  });

  it("marca el onboarding como completado una sola vez", async () => {
    await completarOnboarding(e.A.barberia.id);
    const primera = (await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow())).onboardingCompletedAt;
    expect(primera).toBeInstanceOf(Date);
    await completarOnboarding(e.A.barberia.id);
    expect((await conBarberia(e.A.barberia.id, (db) => db.barbershop.findFirstOrThrow())).onboardingCompletedAt).toEqual(primera);
  });
});

describe("Recuperación de contraseña", () => {
  it("envía un enlace de un solo uso y permite cambiar la contraseña", async () => {
    let enlace = "";
    const info = vi.spyOn(console, "info").mockImplementation((m: string) => { enlace = /restablecer\/([A-Za-z0-9_-]+)/.exec(m)?.[1] ?? enlace; });
    await solicitarRecuperacion(e.A.dueno.email, "1.1.1.1", "https://ejemplo.test");
    info.mockRestore();
    expect(enlace).toMatch(/^[A-Za-z0-9_-]{43}$/);
    // En la base solo está el hash del token.
    expect(await infraestructura.passwordResetToken.count({ where: { tokenHash: enlace } })).toBe(0);
    expect(await tokenRecuperacionValido(enlace)).toBe(true);

    await restablecerConToken(enlace, "clave-nueva-789", "1.1.1.1");
    expect((await autenticarDueno(e.A.dueno.email, e.A.password, "1.1.1.1")).ok).toBe(false);
    expect((await autenticarDueno(e.A.dueno.email, "clave-nueva-789", "1.1.1.1")).ok).toBe(true);
    // El enlace no sirve dos veces.
    expect(await tokenRecuperacionValido(enlace)).toBe(false);
    await expect(restablecerConToken(enlace, "otra-clave-000", "1.1.1.1")).rejects.toMatchObject({ codigo: "TOKEN_INVALIDO" });
  });

  it("no revela si el correo existe y rechaza enlaces vencidos o inventados", async () => {
    expect(await solicitarRecuperacion("nadie@prueba.test", "3.3.3.3", "https://ejemplo.test")).toEqual({ enviado: false });
    expect(await infraestructura.passwordResetToken.count()).toBe(1);
    expect(await tokenRecuperacionValido("inventado")).toBe(false);
    await expect(restablecerConToken("inventado", "clave-nueva-789", "1.1.1.1")).rejects.toMatchObject({ codigo: "TOKEN_INVALIDO" });
  });

  it("limita las solicitudes por correo", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    for (let i = 0; i < 5; i++) await solicitarRecuperacion(e.B.dueno.email, `4.4.4.${i}`, "https://ejemplo.test");
    info.mockRestore();
    expect(await infraestructura.passwordResetToken.count({ where: { ownerUserId: e.B.dueno.id } })).toBe(3);
  });
});
