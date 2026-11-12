import type { Metadata } from "next";
import { PaginaLegal } from "@/components/sitio";
import { NOMBRE_PLATAFORMA } from "@/lib/config";

export const metadata: Metadata = { title: "Términos del servicio" };

// Texto base. Hazlo revisar por un abogado antes de vender el servicio.
export default function PaginaTerminos() {
  const P = NOMBRE_PLATAFORMA;
  return (
    <PaginaLegal titulo="Términos del servicio">
      <p>Estos términos regulan el uso de {P} por parte de las barberías que contratan el servicio («la Barbería»).</p>
      <h2>1. El servicio</h2>
      <p>{P} es una plataforma en línea que permite a la Barbería ofrecer a sus clientes una tarjeta de fidelidad digital, registrar sellos y recompensas, y consultar métricas de su programa.</p>
      <h2>2. Prueba gratis y suscripción</h2>
      <p>La cuenta nueva incluye un período de prueba gratis. Al terminar, la Barbería debe pagar la mensualidad del plan elegido para seguir usando el panel. Los pagos se realizan por adelantado y cubren el período indicado al registrarse el pago.</p>
      <h2>3. Vencimiento</h2>
      <p>Si la suscripción vence, tras un período de gracia el panel del dueño y de los barberos se bloquea hasta la renovación. Los datos no se eliminan y las tarjetas de los clientes finales siguen visibles en modo de solo lectura.</p>
      <h2>4. Datos de los clientes finales</h2>
      <p>La Barbería es titular del banco de datos de sus clientes y responsable de su tratamiento conforme a la Ley N.° 29733. {P} actúa como encargado del tratamiento: aloja y procesa esos datos únicamente para prestar el servicio, no los usa para fines propios y no los comparte con otras barberías.</p>
      <h2>5. Uso aceptable</h2>
      <p>La Barbería se compromete a enviar mensajes solo a los clientes que lo autorizaron, a custodiar sus contraseñas y PINs, y a no usar la plataforma para fines ilícitos.</p>
      <h2>6. Disponibilidad</h2>
      <p>Trabajamos para mantener el servicio disponible de forma continua, pero puede haber interrupciones por mantenimiento o causas ajenas a nuestro control.</p>
      <h2>7. Cancelación</h2>
      <p>La Barbería puede dejar de usar el servicio en cualquier momento y solicitar la exportación o eliminación de sus datos.</p>
    </PaginaLegal>
  );
}
