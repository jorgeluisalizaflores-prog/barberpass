// Estado de la suscripción. Es la ÚNICA página del panel que sigue disponible
// cuando la barbería está bloqueada por falta de pago.
import { Alerta, claseBoton, Insignia, Tabla, Tarjeta, Titulo } from "@/components/ui";
import { contextoDueno } from "@/lib/auth/guardas";
import { NOMBRE_PLATAFORMA } from "@/lib/config";
import { conBarberia } from "@/lib/db";
import { formatoFecha, formatoSoles } from "@/lib/fechas";
import { obtenerConfigPlataforma } from "@/lib/tenancy/resolver";
import { enlaceWhatsapp } from "@/lib/whatsapp";

const TONO = { PRUEBA: "azul", ACTIVA: "verde", EN_GRACIA: "rojo", VENCIDA: "rojo", SUSPENDIDA: "rojo" } as const;
const METODO = { YAPE: "Yape", PLIN: "Plin", TRANSFERENCIA: "Transferencia", EFECTIVO: "Efectivo", OTRO: "Otro" } as const;

export default async function PaginaSuscripcion({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { barberia, suscripcion: s } = await contextoDueno(slug);
  const cfg = await obtenerConfigPlataforma();
  const pagos = await conBarberia(barberia.id, (db) => db.payment.findMany({ orderBy: { paidAt: "desc" }, take: 24 }));
  const contacto = cfg.contactWhatsapp
    ? enlaceWhatsapp(cfg.contactWhatsapp, `Hola, quiero renovar la suscripción de ${barberia.name} (${slug}) en ${NOMBRE_PLATAFORMA}.`)
    : null;

  return (
    <>
      <Titulo>Suscripción</Titulo>

      {s.bloqueada && (
        <Alerta tono="error" className="mb-5 text-base">
          <strong>{s.estado === "SUSPENDIDA" ? "Tu cuenta está suspendida." : "Tu suscripción venció y el panel está bloqueado."}</strong>{" "}
          {s.estado === "SUSPENDIDA" && barberia.suspendedNote ? `${barberia.suspendedNote} ` : ""}
          No se borró ningún dato: tus clientes siguen viendo su tarjeta. Renueva para volver a sumar sellos y usar el panel.
        </Alerta>
      )}
      {s.estado === "EN_GRACIA" && (
        <Alerta tono="aviso" className="mb-5">
          Tu suscripción venció el {formatoFecha(s.venceEl)}. Tienes hasta el <strong>{formatoFecha(s.finGracia)}</strong> para renovar antes de que el panel se bloquee.
        </Alerta>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Tarjeta className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Estado</h2>
            <Insignia tono={TONO[s.estado]}>{s.etiqueta}</Insignia>
          </div>
          <dl className="grid grid-cols-2 gap-y-2 text-sm">
            <dt className="text-slate-500">Plan</dt><dd className="font-semibold">{barberia.plan.name}</dd>
            <dt className="text-slate-500">Precio</dt><dd className="font-semibold">{formatoSoles(barberia.plan.priceMonthly)} al mes</dd>
            <dt className="text-slate-500">Barberos</dt><dd className="font-semibold">{barberia.plan.maxBarbers == null ? "Ilimitados" : `Hasta ${barberia.plan.maxBarbers}`}</dd>
            <dt className="text-slate-500">{s.estado === "PRUEBA" ? "Prueba gratis hasta" : "Vence el"}</dt>
            <dd className="font-semibold">{s.venceEl ? formatoFecha(s.venceEl) : "Sin vencimiento"}</dd>
            {s.diasRestantes != null && s.diasRestantes >= 0 && (<><dt className="text-slate-500">Días restantes</dt><dd className="font-semibold">{s.diasRestantes}</dd></>)}
          </dl>
        </Tarjeta>

        <Tarjeta className="space-y-3">
          <h2 className="font-bold">Cómo renovar</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
            <li>Paga tu mensualidad por Yape, Plin o transferencia.</li>
            <li>Envíanos la constancia por WhatsApp.</li>
            <li>Registramos tu pago y tu fecha de vencimiento se actualiza al instante.</li>
          </ol>
          {contacto
            ? <a href={contacto} target="_blank" rel="noopener noreferrer" className={claseBoton({ variante: "whatsapp", tamano: "lg" }, "w-full")}>Renovar por WhatsApp</a>
            : <p className="text-sm text-slate-500">Escríbenos al canal de soporte de {NOMBRE_PLATAFORMA} para renovar.</p>}
        </Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Historial de pagos</h2>
      {pagos.length === 0 ? (
        <p className="text-sm text-slate-500">Aún no hay pagos registrados.</p>
      ) : (
        <Tabla>
          <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Período cubierto</th></tr></thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id}>
                <td>{formatoFecha(p.paidAt)}</td><td className="font-semibold">{formatoSoles(p.amount)}</td><td>{METODO[p.method]}</td>
                <td>{formatoFecha(p.periodStart)} – {formatoFecha(p.periodEnd)}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
