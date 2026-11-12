// Destino del QR personal del cliente. Solo le sirve a un barbero con sesión
// en ESTA barbería: lo lleva directo a la ficha para sumar el sello.
// Cualquier otra persona que lo escanee no ve ningún dato del cliente.
import { redirect } from "next/navigation";
import { LogoBarberia } from "@/components/marca-barberia";
import { EnlaceBoton } from "@/components/ui";
import { sesionAutorizaBarberia } from "@/lib/auth/autorizacion";
import { requerirBarberia } from "@/lib/auth/guardas";
import { leerSesion } from "@/lib/auth/sesion";

export default async function PaginaQrCliente({ params }: { params: Promise<{ slug: string; qrToken: string }> }) {
  const { slug, qrToken } = await params;
  const { barberia } = await requerirBarberia(slug);
  const sesion = await leerSesion("BARBERO");
  if (sesionAutorizaBarberia(sesion, barberia.id, "BARBERO")) redirect(`/${slug}/barbero/qr/${qrToken}`);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-4 px-4 py-8 text-center">
      <LogoBarberia barberia={barberia} tamano={72} />
      <h1 className="text-xl font-bold">{barberia.name}</h1>
      <p className="text-sm text-slate-600">Este código es para que lo escanee el barbero al momento de tu corte.</p>
      <EnlaceBoton href={`/${slug}/barbero/ingresar?siguiente=${encodeURIComponent(`/${slug}/barbero/qr/${qrToken}`)}`} variante="secundario">
        Soy barbero: ingresar
      </EnlaceBoton>
      <EnlaceBoton href={`/${slug}/registro`} variante="fantasma">Quiero mi tarjeta</EnlaceBoton>
    </main>
  );
}
