// Crea o regenera la barbería demo con datos ficticios.
// Uso:  npm run demo            (contraseña del dueño demo: DEMO_PASSWORD o "demo12345")
import "dotenv/config";
import { ACTOR_SISTEMA } from "../src/lib/auditoria";
import { DEMO, reiniciarDemo } from "../src/lib/servicios/demo";

reiniciarDemo(ACTOR_SISTEMA)
  .then((d) => {
    console.log(`✔ Barbería demo lista: /${d.slug}`);
    console.log(`  Página pública de demostración: /demo`);
    console.log(`  Panel del dueño:  /ingresar  →  ${d.email}  /  ${d.password}`);
    console.log(`  Panel del barbero: /${d.slug}/barbero  →  PIN ${DEMO.pinBarberos} (Carlos, Renzo o Miguel)`);
    console.log(`  PIN de autorización del dueño: ${DEMO.pinDueno}`);
    process.exit(0);
  })
  .catch((e) => { console.error("✖", e.message ?? e); process.exit(1); });
