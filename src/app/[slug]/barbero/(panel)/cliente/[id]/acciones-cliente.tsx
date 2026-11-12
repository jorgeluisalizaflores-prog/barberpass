"use client";
// Botones del barbero: sumar sello (con confirmación en dos toques, sin
// ventanas emergentes), canjear recompensa y sello extra con PIN del dueño.
import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/acciones";
import { Alerta, Boton, CLASE_INPUT } from "@/components/ui";

type Accion = (previo: EstadoForm, fd: FormData) => Promise<EstadoForm>;

type Props = {
  nombre: string;
  recompensas: number;
  recompensa: string;
  yaSelladoHoy: boolean;
  tienePinDueno: boolean;
  sumar: Accion;
  canjear: Accion;
};

export function AccionesCliente({ nombre, recompensas, recompensa, yaSelladoHoy, tienePinDueno, sumar, canjear }: Props) {
  const [estadoSello, enviarSello, sellando] = useActionState(sumar, {});
  const [estadoCanje, enviarCanje, canjeando] = useActionState(canjear, {});
  const [confirma, setConfirma] = useState<"" | "sello" | "canje">("");
  const [pedirExtra, setPedirExtra] = useState(false);

  const bloqueadoHoy = yaSelladoHoy || estadoSello.codigo === "YA_SELLADO_HOY";
  const primerNombre = nombre.split(" ")[0];

  return (
    <div className="space-y-4">
      {estadoSello.ok && <Alerta tono="ok" className="text-base font-semibold">✔ {estadoSello.ok}</Alerta>}
      {estadoCanje.ok && <Alerta tono="ok" className="text-base font-semibold">🎁 {estadoCanje.ok}</Alerta>}
      {estadoSello.error && estadoSello.codigo !== "YA_SELLADO_HOY" && <Alerta tono="error">{estadoSello.error}</Alerta>}
      {estadoCanje.error && <Alerta tono="error">{estadoCanje.error}</Alerta>}

      {/* Recompensa disponible */}
      {recompensas > 0 && (
        <div className="rounded-3xl border-2 border-emerald-500 bg-emerald-50 p-4 text-center">
          <p className="text-lg font-extrabold text-emerald-900">🎉 ¡{primerNombre} tiene {recompensas === 1 ? "un" : recompensas} {recompensa.toLowerCase()}!</p>
          <form action={enviarCanje} className="mt-3">
            {confirma === "canje" ? (
              <div className="grid grid-cols-2 gap-2">
                <Boton type="button" variante="secundario" tamano="lg" onClick={() => setConfirma("")}>Cancelar</Boton>
                <Boton type="submit" tamano="lg" className="bg-emerald-600 text-white" disabled={canjeando} onClick={() => setTimeout(() => setConfirma(""), 0)}>
                  {canjeando ? "Canjeando…" : "Sí, canjear"}
                </Boton>
              </div>
            ) : (
              <Boton type="button" tamano="xl" className="bg-emerald-600 text-white" disabled={canjeando} onClick={() => setConfirma("canje")}>
                Canjear {recompensa.toLowerCase()}
              </Boton>
            )}
          </form>
        </div>
      )}

      {/* Sumar sello */}
      {!bloqueadoHoy ? (
        <form action={enviarSello}>
          {confirma === "sello" ? (
            <div className="space-y-2">
              <p className="text-center text-base font-semibold">¿Sumar 1 sello a {primerNombre}?</p>
              <div className="grid grid-cols-2 gap-2">
                <Boton type="button" variante="secundario" tamano="lg" className="py-6" onClick={() => setConfirma("")}>Cancelar</Boton>
                <Boton type="submit" variante="acento" tamano="lg" className="py-6 text-lg" disabled={sellando} onClick={() => setTimeout(() => setConfirma(""), 0)}>
                  {sellando ? "Sumando…" : "Sí, sumar"}
                </Boton>
              </div>
            </div>
          ) : (
            <Boton type="button" variante="acento" tamano="xl" className="py-8 text-2xl" disabled={sellando} onClick={() => setConfirma("sello")}>
              ✂ Sumar sello
            </Boton>
          )}
        </form>
      ) : (
        <div className="space-y-3">
          <Alerta tono="aviso">
            <strong>{primerNombre} ya recibió su sello de hoy.</strong> Solo se permite 1 sello por día; para sumar otro se necesita la autorización del dueño.
          </Alerta>
          {!pedirExtra ? (
            <Boton type="button" variante="secundario" className="w-full" onClick={() => setPedirExtra(true)}>Sello extra con autorización del dueño</Boton>
          ) : !tienePinDueno ? (
            <Alerta tono="info">El dueño aún no configuró su PIN de autorización (lo hace en su panel, sección «Marca y recompensa»).</Alerta>
          ) : (
            <form action={enviarSello} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
              <label className="block text-sm font-medium text-slate-700">
                PIN de autorización del dueño
                <input name="pinDueno" type="password" inputMode="numeric" pattern="\d{4,6}" maxLength={6} required autoComplete="off" className={`${CLASE_INPUT} mt-1 text-center text-2xl tracking-widest`} />
              </label>
              <Boton type="submit" tamano="lg" className="w-full" disabled={sellando}>{sellando ? "Verificando…" : "Autorizar y sumar sello"}</Boton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
