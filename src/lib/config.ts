// Configuración central de la plataforma. El nombre comercial se cambia con la
// variable de entorno NEXT_PUBLIC_PLATFORM_NAME, sin tocar el código.
export const NOMBRE_PLATAFORMA = process.env.NEXT_PUBLIC_PLATFORM_NAME || "BarberPass";

export const ZONA_HORARIA = "America/Lima";

export const COOKIES = {
  SUPER_ADMIN: "bp_admin",
  DUENO: "bp_dueno",
  BARBERO: "bp_barbero",
} as const;

// Duración de las sesiones, en horas.
export const DURACION_SESION_HORAS = {
  SUPER_ADMIN: 12,
  DUENO: 24 * 14,
  BARBERO: 12,
  IMPERSONACION: 1,
} as const;

// Límite de intentos fallidos (fuerza bruta).
export const LIMITE_INTENTOS = {
  ventanaMinutos: 15,
  maxPorCuenta: 5,
  maxPorIp: 20,
} as const;

// Slugs que no puede usar una barbería porque chocan con rutas de la plataforma.
export const SLUGS_RESERVADOS = new Set([
  "admin", "api", "onboarding", "registro", "ingresar", "salir", "precios", "privacidad",
  "terminos", "contacto", "demo-admin", "www", "app", "static", "public", "_next", "sw.js",
  "manifest", "favicon.ico", "robots.txt", "sitemap.xml", "soporte", "ayuda", "blog", "login",
]);

export function urlBase(): string {
  return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}
