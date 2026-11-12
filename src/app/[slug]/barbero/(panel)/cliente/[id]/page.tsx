import Link from "next/link";
import { notFound } from "next/navigation";
import { Sellos } from "@/components/sellos";
import { claseBoton, EnlaceBoton } from "@/components/ui";
import { contextoBarbero } from "@/lib/auth/guardas";
import { conBarberia } from "@/lib/db";
import { fechaLocalLima, formatoFechaHora } from "@/lib/fechas";
import { calcularTarjeta } from "@/lib/fidelidad/tarjeta";
import { historialCliente } from "@/lib/servicios/clientes";
import { urlBasePublica } from "@/lib/url";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import { canjearAccion, sumarSelloAccion } from "./acciones";
import { AccionesCliente } from "./acciones-cliente";

export default async function PaginaClienteBarbero({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const { barberia } = await contextoBarbero(slug);

  // Todo dentro del ámbito de la barbería del barbero: un id de otra barbería da 404.
  const datos = await conBarberia(barberia.id, async (db) => {
    const cliente = await db.customer.findFirst({ where: { id }, select: { id: true, name: true, phone: true, stampsCount: true, cardToken: true, totalRedemptions: true } });
    if (!cliente) return null;
    const hoy = fechaLocalLima();
    const yaSelladoHoy = !!(await db.stamp.findFirst({ where: { customerId: id, localDate: hoy, type: { in: ["CORTE", "EXTRA_AUTORIZADO"] } }, select: { id: true } }));
    const tienePin = !!(await db.barbershop.findFirst({ select: { ownerPinHash: true } }))?.ownerPinHash;
    return { cliente, yaSelladoHoy, tienePin, historial: await historialCliente(db, id, 6) };
  });
  if (!datos) notFound();

  const { cliente, yaSelladoHoy, tienePin, historial } = datos;
  const estado = calcularTarjeta(cliente.stampsCount, barberia.stampsRequired, barberia.rewardText);
  const urlTarjeta = `${await urlBasePublica()}/${slug}/tarjeta/${cliente.cardToken}`;
  const reenviar = enlaceWhatsapp(cliente.phone, `Hola ${cliente.name.split(" ")[0]}, aquí está tu tarjeta de fidelidad de ${barberia.name}: ${urlTarjeta}`);

  return (
    <div className="space-y-5">
      <Link href={`/${slug}/barbero`} className="text-sm text-slate-600 underline">← Otro cliente</Link>

      <section className="rounded-3xl bg-white p-5 shadow">
        <h1 className="text-2xl font-extrabold">{cliente.name}</h1>
        <p className="mb-4 text-sm text-slate-500">{cliente.phone} · {cliente.totalRedemptions} canje{cliente.totalRedemptions === 1 ? "" : "s"}</p>
        <Sellos llenos={estado.sellosVisibles} total={estado.sellosRequeridos} icono={barberia.stampIcon} resaltarUltimo />
        <p className="mt-3 text-center text-sm font-medium text-slate-700">{estado.sellosVisibles} de {estado.sellosRequeridos} sellos</p>
      </section>

      <AccionesCliente
        nombre={cliente.name}
        recompensas={estado.recompensas}
        recompensa={barberia.rewardText}
        yaSelladoHoy={yaSelladoHoy}
        tienePinDueno={tienePin}
        sumar={sumarSelloAccion.bind(null, slug, cliente.id)}
        canjear={canjearAccion.bind(null, slug, cliente.id)}
      />

      <EnlaceBoton href={`/${slug}/barbero`} variante="secundario" tamano="lg" className="w-full">Atender a otro cliente</EnlaceBoton>

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">Últimos movimientos</h2>
        {historial.length === 0 ? <p className="text-sm text-slate-500">Sin movimientos.</p> : (
          <ul className="space-y-1 text-sm">
            {historial.map((m) => (
              <li key={m.id} className="flex justify-between gap-2">
                <span>{m.tipo === "CANJE" ? "🎁 Canje" : m.tipo === "BIENVENIDA" ? "✂ Bienvenida" : m.tipo === "EXTRA_AUTORIZADO" ? "✂ Sello extra" : "✂ Corte"}{m.barbero ? ` · ${m.barbero}` : ""}</span>
                <span className="text-slate-500">{formatoFechaHora(m.fecha)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <a href={reenviar} target="_blank" rel="noopener noreferrer" className={claseBoton({ variante: "whatsapp", tamano: "md" }, "w-full")}>
        Reenviarle su tarjeta por WhatsApp
      </a>
    </div>
  );
}
