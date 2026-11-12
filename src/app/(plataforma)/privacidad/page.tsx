import type { Metadata } from "next";
import { PaginaLegal } from "@/components/sitio";
import { NOMBRE_PLATAFORMA } from "@/lib/config";

export const metadata: Metadata = { title: "Política de privacidad" };

// Texto base. Hazlo revisar por un abogado antes de vender el servicio.
export default function PaginaPrivacidadPlataforma() {
  const P = NOMBRE_PLATAFORMA;
  return (
    <PaginaLegal titulo="Política de privacidad">
      <p>Esta política explica cómo {P} trata los datos personales, conforme a la Ley N.° 29733, Ley de Protección de Datos Personales, y su Reglamento.</p>
      <h2>1. Datos de las barberías (somos responsables)</h2>
      <p>De quienes crean una cuenta recopilamos nombre, correo, celular y datos de su barbería, para prestar el servicio, dar soporte y gestionar la suscripción.</p>
      <h2>2. Datos de los clientes finales (somos encargados)</h2>
      <p>Los datos de los clientes de cada barbería (nombre, celular, cumpleaños opcional e historial de sellos) pertenecen a esa barbería, que es la responsable de su tratamiento. {P} los aloja y procesa por encargo suyo, con aislamiento estricto entre barberías.</p>
      <h2>3. Seguridad</h2>
      <p>Las contraseñas y PINs se guardan cifrados con hash, las tarjetas usan enlaces imposibles de adivinar y cada acción relevante queda registrada en un historial de auditoría.</p>
      <h2>4. Conservación y transferencias</h2>
      <p>Conservamos los datos mientras la cuenta esté activa y por el plazo necesario para cumplir obligaciones legales. Los datos pueden alojarse en servidores fuera del Perú con medidas de seguridad adecuadas.</p>
      <h2>5. Tus derechos</h2>
      <p>Puedes ejercer tus derechos de acceso, rectificación, cancelación y oposición escribiéndonos. Si eres cliente de una barbería, dirígete primero a ella; te ayudaremos a atender tu solicitud.</p>
    </PaginaLegal>
  );
}
