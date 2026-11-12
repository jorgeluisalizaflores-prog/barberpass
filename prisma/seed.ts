// Datos iniciales de la plataforma: planes y configuración.
// (La barbería demo se crea con:  npm run demo)
import "dotenv/config";
import { conPlataforma } from "../src/lib/db";
import { politicaPrivacidadBase } from "../src/lib/privacidad";

const PLANES = [
  { name: "Básico", description: "Para barberías que recién empiezan.", priceMonthly: 49, maxBarbers: 2, sortOrder: 1 },
  { name: "Pro", description: "Para barberías con equipo.", priceMonthly: 89, maxBarbers: 6, sortOrder: 2 },
  { name: "Premium", description: "Barberos ilimitados.", priceMonthly: 149, maxBarbers: null, sortOrder: 3 },
];

async function main() {
  await conPlataforma(async (db) => {
    for (const p of PLANES) {
      await db.plan.upsert({ where: { name: p.name }, create: p, update: {} });
    }
    await db.platformSettings.upsert({
      where: { id: 1 },
      create: { id: 1, contactWhatsapp: process.env.CONTACT_WHATSAPP ?? "", basePrivacyPolicy: politicaPrivacidadBase("{barberia}", process.env.NEXT_PUBLIC_PLATFORM_NAME || "BarberPass") },
      update: {},
    });
  });
  console.log("✔ Planes y configuración inicial listos.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
