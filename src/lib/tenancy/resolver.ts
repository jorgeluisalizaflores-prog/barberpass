// Resolución de la barbería a partir de la petición.
//
// Hoy la barbería se identifica por el slug de la URL (plataforma.com/<slug>).
// Para pasar a subdominios en la fase 2 basta con que src/proxy.ts reescriba
// "<slug>.plataforma.com/..." a "/<slug>/...": las páginas no cambian porque
// todas obtienen la barbería a través de este módulo.
import "server-only";
import { cache } from "react";
import { conPlataforma } from "../db";

const CAMPOS_PUBLICOS = {
  id: true, slug: true, name: true, phone: true, address: true, city: true,
  logoMime: true, logoVersion: true, colorPrimary: true, colorAccent: true, stampIcon: true, tagline: true,
  stampsRequired: true, rewardText: true, welcomeStampEnabled: true, welcomeStamps: true,
  inactivityDays: true, winbackTemplate: true, birthdayTemplate: true, privacyPolicy: true,
  planId: true, status: true, trialEndsAt: true, paidUntil: true, suspendedNote: true, isDemo: true,
  onboardingCompletedAt: true, createdAt: true,
  plan: { select: { id: true, name: true, priceMonthly: true, maxBarbers: true, maxCustomers: true } },
} as const;

/** Barbería por slug (sin datos sensibles ni el binario del logo). */
export const obtenerBarberiaPorSlug = cache(async (slug: string) => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
  return conPlataforma((db) => db.barbershop.findUnique({ where: { slug }, select: CAMPOS_PUBLICOS }));
});

export type BarberiaActual = NonNullable<Awaited<ReturnType<typeof obtenerBarberiaPorSlug>>>;

export const CONFIG_POR_DEFECTO = {
  id: 1, trialDays: 14, graceDays: 5, expiringNoticeDays: 7, contactWhatsapp: "", basePrivacyPolicy: "",
};

export const obtenerConfigPlataforma = cache(async () => {
  const cfg = await conPlataforma((db) => db.platformSettings.findUnique({ where: { id: 1 } }));
  return cfg ?? CONFIG_POR_DEFECTO;
});

/** URL del logo de la barbería (o null si no subió uno). */
export function urlLogo(b: { slug: string; logoMime: string | null; logoVersion: number }): string | null {
  return b.logoMime ? `/${b.slug}/logo?v=${b.logoVersion}` : null;
}
