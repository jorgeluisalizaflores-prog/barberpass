import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Las pruebas corren contra una base PostgreSQL real (barberpass_test) usando el
// MISMO rol restringido que la aplicación, para verificar RLS de verdad.
const BASE = process.env.TEST_DATABASE_HOST ?? "localhost:5432";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./tests/stub-vacio.ts", import.meta.url)),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? `postgresql://barberpass_app:app_dev@${BASE}/barberpass_test`,
      DIRECT_URL: process.env.TEST_DIRECT_URL ?? `postgresql://barberpass_owner:owner_dev@${BASE}/barberpass_test`,
    },
  },
});
