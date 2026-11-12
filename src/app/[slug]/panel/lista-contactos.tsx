import { BotonWhatsapp } from "@/components/boton-whatsapp";
import { Insignia } from "@/components/ui";
import { formatoFecha, MESES } from "@/lib/fechas";
import { rellenarPlantilla } from "@/lib/whatsapp";

type Contacto = { id: string; name: string; phone: string; stampsCount: number; lastVisitAt: Date | null; createdAt: Date; cardToken: string; birthDay: number | null; birthMonth: number | null; whatsappOptIn: boolean };

/** Lista de clientes con botón de WhatsApp y mensaje personalizado ya escrito. */
export function ListaContactos({
  clientes, plantilla, barberia, urlBase, modo, hoy,
}: {
  clientes: Contacto[]; plantilla: string; urlBase: string; modo: "recuperar" | "cumple"; hoy?: number;
  barberia: { slug: string; name: string; rewardText: string };
}) {
  return (
    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
      {clientes.map((c) => {
        const mensaje = rellenarPlantilla(plantilla, {
          nombre: c.name.split(" ")[0], barberia: barberia.name, sellos: c.stampsCount,
          recompensa: barberia.rewardText.toLowerCase(), tarjeta: `${urlBase}/${barberia.slug}/tarjeta/${c.cardToken}`,
        });
        return (
          <li key={c.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-semibold">
                {c.name}{" "}
                {modo === "cumple" && c.birthDay === hoy && <Insignia tono="ambar">¡Hoy!</Insignia>}
              </div>
              <div className="text-sm text-slate-500">
                {c.phone} · {c.stampsCount} sello{c.stampsCount === 1 ? "" : "s"} ·{" "}
                {modo === "cumple" && c.birthDay && c.birthMonth
                  ? `cumple el ${c.birthDay} de ${MESES[c.birthMonth - 1]}`
                  : c.lastVisitAt ? `última visita: ${formatoFecha(c.lastVisitAt)}` : `sin visitas desde su registro (${formatoFecha(c.createdAt)})`}
              </div>
            </div>
            {c.whatsappOptIn
              ? <BotonWhatsapp celular={c.phone} mensaje={mensaje} nombre={c.name} />
              : <span className="text-xs text-slate-500">No aceptó recibir mensajes</span>}
          </li>
        );
      })}
    </ul>
  );
}
