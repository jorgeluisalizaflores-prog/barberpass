// Barbería demo con datos ficticios, para mostrar la plataforma a posibles
// clientes. Se puede regenerar cuando se quiera (panel de administración o
// `npm run demo`). No vence, no registra pagos y no cuenta en las métricas.
import type { Prisma } from "@prisma/client";
import { auditar, type Actor } from "../auditoria";
import { hashSecreto } from "../auth/hash";
import { NOMBRE_PLATAFORMA } from "../config";
import { conPlataforma } from "../db";
import { diaMesLima, fechaLocalLima, sumarDias } from "../fechas";
import { politicaPrivacidadBase } from "../privacidad";
import { tokenSeguro } from "../tokens";
import { PLANTILLA_CUMPLE, PLANTILLA_RECUPERAR } from "../whatsapp";

export const DEMO = {
  slug: "barberia-demo",
  nombre: "Barbería Don Bigote",
  email: "demo@barberpass.app",
  pinBarberos: "1234",
  pinDueno: "2468",
  celularVitrina: "999000001",
};

const NOMBRES = ["Luis", "Carlos", "José", "Miguel", "Jorge", "Diego", "Renzo", "Bruno", "Sebastián", "Piero", "Kevin", "Jhon", "Álvaro", "Fabrizio", "Gonzalo", "Mateo", "Rodrigo", "Franco", "André", "Cristian", "Óscar", "Paolo", "Hugo", "Iván", "Marco"];
const APELLIDOS = ["Ramírez", "Quispe", "Flores", "Huamán", "Rojas", "Mamani", "García", "Torres", "Díaz", "Vargas", "Castillo", "Chávez", "Mendoza", "Salazar", "Gutiérrez", "Paredes", "Córdova", "Espinoza", "Ríos", "Valverde"];

/** Generador pseudoaleatorio con semilla: la demo sale igual cada vez. */
function azar(semilla: number) {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

/** Borra (si existe) y vuelve a crear la barbería demo con ~60 clientes y 5 meses de actividad. */
export async function reiniciarDemo(
  actor: Actor,
  // En producción nunca se usa una contraseña conocida: si no defines
  // DEMO_PASSWORD se genera una al azar y se muestra una sola vez.
  passwordDueno = process.env.DEMO_PASSWORD || (process.env.NODE_ENV === "production" ? tokenSeguro(9) : "demo12345"),
) {
  const [passwordHash, pinHash, ownerPinHash] = await Promise.all([hashSecreto(passwordDueno), hashSecreto(DEMO.pinBarberos), hashSecreto(DEMO.pinDueno)]);
  const r = azar(29733);
  const ahora = new Date();
  const { mes } = diaMesLima(ahora);

  const resultado = await conPlataforma(async (db) => {
    const previa = await db.barbershop.findUnique({ where: { slug: DEMO.slug }, select: { id: true, isDemo: true } });
    if (previa && !previa.isDemo) throw new Error(`Ya existe una barbería real con el slug ${DEMO.slug}`);
    if (previa) {
      const w = { barbershopId: previa.id };
      await db.redemption.deleteMany({ where: w });
      await db.stamp.deleteMany({ where: w });
      await db.customer.deleteMany({ where: w });
      await db.barber.deleteMany({ where: w });
      await db.ownerUser.deleteMany({ where: w });
      await db.barbershop.delete({ where: { id: previa.id } });
    }
    const plan = (await db.plan.findFirst({ where: { name: "Pro" } })) ?? (await db.plan.findFirst({ orderBy: { sortOrder: "desc" } }));
    if (!plan) throw new Error("No hay planes. Ejecuta primero: npm run db:seed");

    const b = await db.barbershop.create({
      data: {
        slug: DEMO.slug, name: DEMO.nombre, phone: "987654321", address: "Av. Larco 345", city: "Miraflores, Lima",
        colorPrimary: "#1c1917", colorAccent: "#f59e0b", stampIcon: "TIJERA", planId: plan.id, status: "ACTIVA", isDemo: true,
        trialEndsAt: sumarDias(ahora, 3650), onboardingCompletedAt: ahora, ownerPinHash,
        privacyPolicy: politicaPrivacidadBase(DEMO.nombre, NOMBRE_PLATAFORMA), winbackTemplate: PLANTILLA_RECUPERAR, birthdayTemplate: PLANTILLA_CUMPLE,
        createdAt: sumarDias(ahora, -160),
        owners: { create: { email: DEMO.email, name: "Dueño Demo", passwordHash } },
      },
    });
    const barberos = [];
    for (const name of ["Carlos", "Renzo", "Miguel"]) barberos.push(await db.barber.create({ data: { barbershopId: b.id, name, pinHash, createdAt: sumarDias(ahora, -160) } }));

    let sellosTotales = 0;
    for (let i = 0; i < 60; i++) {
      const nombre = i === 0 ? "Luis Ramírez" : `${NOMBRES[Math.floor(r() * NOMBRES.length)]} ${APELLIDOS[Math.floor(r() * APELLIDOS.length)]}`;
      const alta = sumarDias(ahora, -Math.floor(i === 0 ? 120 : 5 + r() * 150));
      // Perfil: fiel (viene cada ~2-3 semanas), ocasional, o que dejó de venir.
      const perfil = i === 0 ? "fiel" : r() < 0.45 ? "fiel" : r() < 0.6 ? "ocasional" : "perdido";
      const cumpleEsteMes = i === 0 || r() < 0.12;
      const conCumple = cumpleEsteMes || r() < 0.6;

      const cliente = await db.customer.create({
        data: {
          barbershopId: b.id, name: nombre, phone: i === 0 ? DEMO.celularVitrina : `9${String(10000000 + i * 7919 + Math.floor(r() * 5000)).padStart(8, "0")}`,
          birthDay: conCumple ? 1 + Math.floor(r() * 28) : null, birthMonth: conCumple ? (cumpleEsteMes ? mes : 1 + Math.floor(r() * 12)) : null,
          cardToken: tokenSeguro(), qrToken: tokenSeguro(), privacyAcceptedAt: alta, whatsappOptIn: i === 0 || r() < 0.8, whatsappOptInAt: alta, createdAt: alta,
        },
      });

      // Historial: sello de bienvenida y visitas espaciadas hasta hoy (o hasta que dejó de venir).
      await db.stamp.create({ data: { barbershopId: b.id, customerId: cliente.id, type: "BIENVENIDA", localDate: fechaLocalLima(alta), createdAt: alta } });
      let sellos = 1, total = 1, canjes = 0, ultima: Date | null = null;
      const lotSellos: Prisma.StampCreateManyInput[] = [];
      const lotCanjes: Prisma.RedemptionCreateManyInput[] = [];
      const finVisitas = perfil === "perdido" ? sumarDias(alta, 20 + r() * 40) : sumarDias(ahora, i === 0 ? -6 : -1);
      let fecha = sumarDias(alta, perfil === "ocasional" ? 20 + r() * 30 : 10 + r() * 10);
      while (fecha.getTime() < Math.min(finVisitas.getTime(), ahora.getTime())) {
        const barbero = barberos[Math.floor(r() * (r() < 0.5 ? 1 : 3))];
        if (sellos >= b.stampsRequired) {
          lotCanjes.push({ barbershopId: b.id, customerId: cliente.id, barberId: barbero.id, stampsUsed: b.stampsRequired, rewardText: b.rewardText, createdAt: fecha });
          sellos -= b.stampsRequired; canjes++;
        } else {
          const dia = fechaLocalLima(fecha);
          lotSellos.push({ barbershopId: b.id, customerId: cliente.id, barberId: barbero.id, localDate: dia, dailyKey: `${cliente.id}:${dia}`, createdAt: fecha });
          sellos++; total++;
        }
        ultima = fecha;
        fecha = sumarDias(fecha, perfil === "ocasional" ? 30 + r() * 30 : 13 + r() * 12);
      }
      if (lotSellos.length) await db.stamp.createMany({ data: lotSellos });
      if (lotCanjes.length) await db.redemption.createMany({ data: lotCanjes });
      // El cliente "vitrina" queda a 1 corte de su recompensa.
      if (i === 0) { const falta = b.stampsRequired - 1 - sellos; total += falta; sellos = b.stampsRequired - 1; }
      await db.customer.update({ where: { id: cliente.id }, data: { stampsCount: sellos, totalStamps: total, totalRedemptions: canjes, lastVisitAt: ultima } });
      sellosTotales += total;
    }
    await auditar(db, { barbershopId: b.id, actor, accion: "admin.demo.reiniciar", entidad: "Barbershop", entidadId: b.id, detalle: { clientes: 60, sellos: sellosTotales } });
    return { id: b.id, slug: b.slug };
  }, { timeout: 120_000 });
  return { ...resultado, email: DEMO.email, password: passwordDueno };
}

/** Datos públicos de la demo para la página /demo. */
export async function obtenerDemo() {
  return conPlataforma(async (db) => {
    const b = await db.barbershop.findFirst({ where: { slug: DEMO.slug, isDemo: true }, select: { id: true, slug: true, name: true } });
    if (!b) return null;
    const vitrina = await db.customer.findFirst({ where: { barbershopId: b.id, phone: DEMO.celularVitrina }, select: { cardToken: true } });
    return { ...b, cardToken: vitrina?.cardToken ?? null };
  });
}
