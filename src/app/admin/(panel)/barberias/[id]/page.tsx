import Link from "next/link";
import { notFound } from "next/navigation";
import { BotonConfirmar, BotonEnviar, Formulario } from "@/components/formulario";
import { InsigniaEstado } from "@/components/insignia-estado";
import { Alerta, Boton, Campo, Insignia, Metrica, Seleccion, Tabla, Tarjeta, Titulo } from "@/components/ui";
import { requerirSuperAdmin } from "@/lib/auth/guardas";
import { conPlataforma } from "@/lib/db";
import { fechaLocalLima, formatoFecha, formatoSoles } from "@/lib/fechas";
import { detalleBarberia } from "@/lib/servicios/admin";
import { editarBarberiaAccion, impersonarAccion, reactivarAccion, registrarPagoAccion, restablecerPasswordAccion, suspenderAccion } from "../../acciones";

const METODO = { YAPE: "Yape", PLIN: "Plin", TRANSFERENCIA: "Transferencia", EFECTIVO: "Efectivo", OTRO: "Otro" } as const;

export default async function PaginaDetalleBarberia({ params }: { params: Promise<{ id: string }> }) {
  await requerirSuperAdmin();
  const { id } = await params;
  const b = await detalleBarberia(id);
  if (!b) notFound();
  const planes = await conPlataforma((db) => db.plan.findMany({ orderBy: { sortOrder: "asc" } }));
  const s = b.suscripcion;

  return (
    <>
      <Link href="/admin/barberias" className="text-sm text-slate-600 underline">← Barberías</Link>
      <Titulo
        descripcion={<>/{b.slug} · alta el {formatoFecha(b.createdAt)} · <Link href={`/admin/auditoria?barberia=${b.id}`} className="underline">ver auditoría</Link></>}
        acciones={
          <form action={impersonarAccion.bind(null, b.id)}>
            <Boton type="submit" variante="acento">Entrar como esta barbería</Boton>
          </form>
        }
      >
        {b.name} {b.isDemo && <Insignia tono="azul">Demo</Insignia>}
      </Titulo>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tarjeta className="col-span-2 p-4 lg:col-span-1">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">Suscripción</div>
          <div className="mt-2"><InsigniaEstado s={s} /></div>
          <div className="mt-2 text-xs text-slate-600">{s.venceEl ? `Vence el ${formatoFecha(s.venceEl)}` : "Sin vencimiento"}{s.diasRestantes != null ? ` (${s.diasRestantes} días)` : ""}</div>
        </Tarjeta>
        <Metrica etiqueta="Clientes" valor={b._count.customers} />
        <Metrica etiqueta="Barberos" valor={b._count.barbers} detalle={b.plan.maxBarbers == null ? "sin límite" : `máx. ${b.plan.maxBarbers}`} />
        <Metrica etiqueta="Sellos" valor={b._count.stamps} />
        <Metrica etiqueta="Canjes" valor={b._count.redemptions} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Registrar pago */}
        <Tarjeta>
          <h2 className="mb-1 font-bold">Registrar pago</h2>
          <p className="mb-3 text-sm text-slate-600">El sistema calcula el período cubierto y la nueva fecha de vencimiento. Si aún tiene días vigentes, el período empieza cuando terminan.</p>
          {b.isDemo ? <Alerta tono="info">La barbería demo no registra pagos ni vence.</Alerta> : (
            <Formulario accion={registrarPagoAccion.bind(null, b.id)} reiniciarAlExito>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Fecha del pago" name="fecha" type="date" required defaultValue={fechaLocalLima()} max={fechaLocalLima()} />
                <Campo etiqueta="Monto (S/)" name="monto" type="number" step="0.01" min="0.01" required defaultValue={Number(b.plan.priceMonthly).toFixed(2)} />
                <Seleccion etiqueta="Método" name="metodo" required>
                  {Object.entries(METODO).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
                </Seleccion>
                <Seleccion etiqueta="Período cubierto" name="meses" required defaultValue="1">
                  {[1, 2, 3, 6, 12].map((m) => <option key={m} value={m}>{m} {m === 1 ? "mes" : "meses"}</option>)}
                </Seleccion>
              </div>
              <Campo etiqueta="Nota (opcional)" name="nota" maxLength={300} placeholder="N.° de operación, quién pagó…" />
              <BotonEnviar textoEnviando="Registrando…">Registrar pago</BotonEnviar>
            </Formulario>
          )}
        </Tarjeta>

        {/* Datos */}
        <Tarjeta>
          <h2 className="mb-3 font-bold">Datos y plan</h2>
          <Formulario accion={editarBarberiaAccion.bind(null, b.id)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo etiqueta="Nombre" name="name" required defaultValue={b.name} />
              <Campo etiqueta="Slug" name="slug" required defaultValue={b.slug} ayuda="Cambiarlo invalida los QR ya impresos." />
              <Seleccion etiqueta="Plan" name="planId" defaultValue={b.planId}>
                {planes.map((p) => <option key={p.id} value={p.id}>{p.name} · {formatoSoles(p.priceMonthly)}{p.active ? "" : " (inactivo)"}</option>)}
              </Seleccion>
              <Campo etiqueta="Fin de la prueba" name="trialEndsAt" type="date" required defaultValue={fechaLocalLima(b.trialEndsAt)} ayuda="Úsalo para extender la prueba." />
              <Campo etiqueta="WhatsApp" name="phone" defaultValue={b.phone} />
              <Campo etiqueta="Ciudad" name="city" defaultValue={b.city} />
            </div>
            <BotonEnviar textoEnviando="Guardando…">Guardar cambios</BotonEnviar>
          </Formulario>
        </Tarjeta>

        {/* Suspender / reactivar */}
        <Tarjeta>
          <h2 className="mb-1 font-bold">{b.status === "SUSPENDIDA" ? "Reactivar" : "Suspender"}</h2>
          {b.status === "SUSPENDIDA" ? (
            <Formulario accion={reactivarAccion.bind(null, b.id)}>
              <p className="text-sm text-slate-600">Suspendida{b.suspendedNote ? `: ${b.suspendedNote}` : ""}. Al reactivarla vuelve al estado que le corresponde según sus pagos.</p>
              <BotonEnviar textoEnviando="Reactivando…">Reactivar barbería</BotonEnviar>
            </Formulario>
          ) : (
            <Formulario accion={suspenderAccion.bind(null, b.id)}>
              <p className="text-sm text-slate-600">Bloquea el panel del dueño y de los barberos. No se borra nada y las tarjetas de los clientes siguen visibles.</p>
              <Campo etiqueta="Motivo (se muestra al dueño)" name="motivo" maxLength={300} />
              <BotonConfirmar variante="peligro" mensaje={`¿Suspender ${b.name}?`}>Suspender barbería</BotonConfirmar>
            </Formulario>
          )}
        </Tarjeta>

        {/* Dueños */}
        <Tarjeta>
          <h2 className="mb-3 font-bold">Dueño y acceso</h2>
          {b.owners.map((o) => (
            <div key={o.id} className="space-y-3">
              <p className="text-sm"><strong>{o.name}</strong> · {o.email}</p>
              <Formulario accion={restablecerPasswordAccion.bind(null, o.id)} reiniciarAlExito>
                <Campo etiqueta="Nueva contraseña" name="password" type="text" minLength={8} required autoComplete="off" ayuda="Cierra sus sesiones abiertas." />
                <BotonEnviar variante="secundario" textoEnviando="Guardando…">Restablecer contraseña</BotonEnviar>
              </Formulario>
            </div>
          ))}
        </Tarjeta>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Pagos</h2>
      {b.payments.length === 0 ? <p className="text-sm text-slate-500">Sin pagos registrados.</p> : (
        <Tabla>
          <thead><tr><th>Fecha</th><th>Monto</th><th>Método</th><th>Período cubierto</th><th>Nota</th></tr></thead>
          <tbody>
            {b.payments.map((p) => (
              <tr key={p.id}>
                <td>{formatoFecha(p.paidAt)}</td><td className="font-semibold">{formatoSoles(p.amount)}</td><td>{METODO[p.method]}</td>
                <td>{formatoFecha(p.periodStart)} – {formatoFecha(p.periodEnd)} ({p.months} {p.months === 1 ? "mes" : "meses"})</td><td className="text-slate-600">{p.note}</td>
              </tr>
            ))}
          </tbody>
        </Tabla>
      )}
    </>
  );
}
