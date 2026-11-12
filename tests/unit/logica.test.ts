import { describe, expect, it } from "vitest";
import { fechaLocalLima, inicioDiaLima, sumarMeses } from "../../src/lib/fechas";
import { calcularTarjeta } from "../../src/lib/fidelidad/tarjeta";
import { colorSobre } from "../../src/lib/marca";
import { calcularPeriodoPago, calcularSuscripcion } from "../../src/lib/suscripcion/estado";
import { celularSchema, generarSlug, pinSchema, registroClienteSchema, slugSchema } from "../../src/lib/validacion/esquemas";
import { enlaceWhatsapp, rellenarPlantilla } from "../../src/lib/whatsapp";

const d = (iso: string) => new Date(iso);
const CFG = { graceDays: 5, expiringNoticeDays: 7 };

describe("Estado de la suscripción", () => {
  const base = { status: "PRUEBA" as const, trialEndsAt: d("2026-06-15T00:00:00Z"), paidUntil: null, isDemo: false };

  it("en prueba, lejos del vencimiento", () => {
    const r = calcularSuscripcion(base, CFG, d("2026-06-02T00:00:00Z"));
    expect(r).toMatchObject({ estado: "PRUEBA", etiqueta: "En prueba", porVencer: false, bloqueada: false, diasRestantes: 13 });
  });
  it("avisa cuando faltan 7 días o menos", () => {
    expect(calcularSuscripcion(base, CFG, d("2026-06-08T00:00:00Z")).porVencer).toBe(true);
    expect(calcularSuscripcion(base, CFG, d("2026-06-07T00:00:00Z")).porVencer).toBe(false);
  });
  it("vencida pero dentro de los 5 días de gracia: avisa y NO bloquea", () => {
    const r = calcularSuscripcion(base, CFG, d("2026-06-18T00:00:00Z"));
    expect(r).toMatchObject({ estado: "EN_GRACIA", etiqueta: "Vencida", bloqueada: false });
  });
  it("pasada la gracia: bloquea", () => {
    expect(calcularSuscripcion(base, CFG, d("2026-06-20T00:00:00Z")).bloqueada).toBe(false);
    const r = calcularSuscripcion(base, CFG, d("2026-06-20T00:00:01Z"));
    expect(r).toMatchObject({ estado: "VENCIDA", bloqueada: true });
  });
  it("activa con pago vigente", () => {
    const r = calcularSuscripcion({ ...base, status: "ACTIVA", paidUntil: d("2026-08-01T00:00:00Z") }, CFG, d("2026-06-20T00:00:00Z"));
    expect(r).toMatchObject({ estado: "ACTIVA", etiqueta: "Activa", bloqueada: false });
  });
  it("suspendida: siempre bloqueada aunque tenga pago vigente", () => {
    const r = calcularSuscripcion({ ...base, status: "SUSPENDIDA", paidUntil: d("2027-01-01T00:00:00Z") }, CFG, d("2026-06-20T00:00:00Z"));
    expect(r).toMatchObject({ estado: "SUSPENDIDA", bloqueada: true });
  });
  it("la barbería demo nunca vence", () => {
    expect(calcularSuscripcion({ ...base, isDemo: true }, CFG, d("2030-01-01T00:00:00Z")).bloqueada).toBe(false);
  });
});

describe("Período cubierto por un pago", () => {
  it("si aún tiene días vigentes, el período empieza al terminar (no pierde días)", () => {
    const r = calcularPeriodoPago({ trialEndsAt: d("2026-06-15T00:00:00Z"), paidUntil: null }, d("2026-06-10T00:00:00Z"), 1);
    expect(r.periodStart.toISOString()).toBe("2026-06-15T00:00:00.000Z");
    expect(r.periodEnd.toISOString()).toBe("2026-07-15T00:00:00.000Z");
  });
  it("si ya venció, el período empieza el día del pago", () => {
    const r = calcularPeriodoPago({ trialEndsAt: d("2026-01-01T00:00:00Z"), paidUntil: d("2026-05-01T00:00:00Z") }, d("2026-06-10T00:00:00Z"), 3);
    expect(r.periodStart.toISOString()).toBe("2026-06-10T00:00:00.000Z");
    expect(r.periodEnd.toISOString()).toBe("2026-09-10T00:00:00.000Z");
  });
  it("suma meses de calendario sin desbordar el fin de mes", () => {
    expect(sumarMeses(d("2026-01-31T00:00:00Z"), 1).toISOString().slice(0, 10)).toBe("2026-02-28");
    expect(sumarMeses(d("2026-11-30T00:00:00Z"), 3).toISOString().slice(0, 10)).toBe("2027-02-28");
  });
});

describe("Tarjeta de sellos", () => {
  it("mensaje motivador cuando falta 1 corte", () => {
    const t = calcularTarjeta(4, 5, "Corte gratis");
    expect(t).toMatchObject({ sellosVisibles: 4, recompensas: 0, faltan: 1 });
    expect(t.mensaje).toBe("¡Te falta 1 corte para tu corte gratis!");
  });
  it("tarjeta completa: 1 recompensa y se muestra llena", () => {
    expect(calcularTarjeta(5, 5)).toMatchObject({ sellosVisibles: 5, recompensas: 1 });
  });
  it("los sellos de más no se pierden", () => {
    expect(calcularTarjeta(7, 5)).toMatchObject({ sellosVisibles: 2, recompensas: 1, faltan: 3 });
    expect(calcularTarjeta(10, 5)).toMatchObject({ sellosVisibles: 5, recompensas: 2 });
  });
  it("tarjeta vacía", () => {
    expect(calcularTarjeta(0, 5)).toMatchObject({ sellosVisibles: 0, recompensas: 0, faltan: 5 });
  });
});

describe("Validaciones", () => {
  it("celular peruano: 9 dígitos y empieza con 9", () => {
    expect(celularSchema.parse("987654321")).toBe("987654321");
    expect(celularSchema.parse("987 654 321")).toBe("987654321");
    expect(celularSchema.parse("+51 987-654-321")).toBe("987654321");
    for (const malo of ["887654321", "98765432", "9876543210", "abcdefghi", ""]) {
      expect(celularSchema.safeParse(malo).success, malo).toBe(false);
    }
  });
  it("registro de cliente: privacidad obligatoria y cumpleaños coherente", () => {
    const base = { nombre: "Luis", celular: "987654321", aceptaPrivacidad: true, aceptaWhatsapp: false };
    expect(registroClienteSchema.safeParse(base).success).toBe(true);
    expect(registroClienteSchema.safeParse({ ...base, aceptaPrivacidad: false }).success).toBe(false);
    expect(registroClienteSchema.safeParse({ ...base, cumpleDia: 31, cumpleMes: 4 }).success).toBe(false);
    expect(registroClienteSchema.safeParse({ ...base, cumpleDia: 29, cumpleMes: 2 }).success).toBe(true);
    expect(registroClienteSchema.safeParse({ ...base, cumpleDia: 10 }).success).toBe(false);
  });
  it("PIN de 4 a 6 dígitos", () => {
    expect(pinSchema.safeParse("1234").success).toBe(true);
    expect(pinSchema.safeParse("123456").success).toBe(true);
    for (const malo of ["123", "1234567", "12a4"]) expect(pinSchema.safeParse(malo).success).toBe(false);
  });
  it("slug: formato y palabras reservadas", () => {
    expect(generarSlug("Barbería El Bigote ✂")).toBe("barberia-el-bigote");
    expect(slugSchema.safeParse("el-bigote").success).toBe(true);
    for (const malo of ["admin", "api", "El Bigote", "-bigote", "a"]) expect(slugSchema.safeParse(malo).success, malo).toBe(false);
  });
});

describe("Fechas en hora de Lima", () => {
  it("el día cambia a la medianoche de Lima, no a la de UTC", () => {
    expect(fechaLocalLima(d("2026-03-10T04:59:59Z"))).toBe("2026-03-09");
    expect(fechaLocalLima(d("2026-03-10T05:00:00Z"))).toBe("2026-03-10");
    expect(inicioDiaLima("2026-03-10").toISOString()).toBe("2026-03-10T05:00:00.000Z");
  });
});

describe("WhatsApp y marca", () => {
  it("arma el enlace wa.me con código de país y mensaje codificado", () => {
    const msg = rellenarPlantilla("Hola {nombre}, te esperamos en {barberia}", { nombre: "Luis", barberia: "El Bigote" });
    expect(enlaceWhatsapp("987654321", msg)).toBe("https://wa.me/51987654321?text=Hola%20Luis%2C%20te%20esperamos%20en%20El%20Bigote");
  });
  it("elige un color de texto legible sobre el color de marca", () => {
    expect(colorSobre("#111827")).toBe("#ffffff");
    expect(colorSobre("#fde047")).toBe("#111827");
  });
});
