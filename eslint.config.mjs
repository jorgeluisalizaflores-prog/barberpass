import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // AISLAMIENTO ENTRE BARBERÍAS: el código de la aplicación no puede usar el
    // cliente Prisma directamente; debe pasar por conBarberia()/conPlataforma().
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/db/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [{
          name: "@prisma/client",
          importNames: ["PrismaClient"],
          message: "Usa conBarberia() o conPlataforma() de @/lib/db.",
        }],
        patterns: [{
          group: ["**/db/client", "@/lib/db/client"],
          message: "El cliente crudo solo se usa dentro de src/lib/db. Usa conBarberia() o conPlataforma().",
        }],
      }],
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  globalIgnores([".tmp/**", "tests/e2e/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
