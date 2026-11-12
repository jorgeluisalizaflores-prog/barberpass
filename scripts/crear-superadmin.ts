// Crea (o actualiza la contraseña de) un super administrador.
// Uso:  npm run crear-superadmin -- correo@dominio.com "Nombre Apellido" "contraseña-segura"
import "dotenv/config";
import { guardarSuperAdmin } from "../src/lib/servicios/autenticacion";
import { emailSchema, nombreSchema, passwordSchema } from "../src/lib/validacion/esquemas";

async function main() {
  const [emailArg, nombreArg, passwordArg] = process.argv.slice(2);
  if (!emailArg || !nombreArg || !passwordArg) {
    console.error('Uso: npm run crear-superadmin -- correo@dominio.com "Nombre" "contraseña"');
    process.exit(1);
  }
  const email = emailSchema.parse(emailArg);
  const nombre = nombreSchema.parse(nombreArg);
  const password = passwordSchema.parse(passwordArg);
  const admin = await guardarSuperAdmin(email, nombre, password);
  console.log(`✔ Super administrador listo: ${admin.email}. Ingresa en /admin/ingresar`);
}

main().then(() => process.exit(0)).catch((e) => { console.error("✖", e.message ?? e); process.exit(1); });
