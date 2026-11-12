// Aplica las migraciones a la base de pruebas antes de correr la suite.
import { execSync } from "node:child_process";

export default function setup() {
  const BASE = process.env.TEST_DATABASE_HOST ?? "localhost:5432";
  const env = {
    ...process.env,
    DATABASE_URL: process.env.TEST_DATABASE_URL ?? `postgresql://barberpass_app:app_dev@${BASE}/barberpass_test`,
    DIRECT_URL: process.env.TEST_DIRECT_URL ?? `postgresql://barberpass_owner:owner_dev@${BASE}/barberpass_test`,
  };
  execSync("npx prisma migrate deploy", { env, stdio: "pipe" });
}
