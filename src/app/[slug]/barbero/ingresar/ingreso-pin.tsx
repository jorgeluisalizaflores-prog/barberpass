"use client";
// Ingreso del barbero: elige su nombre y marca su PIN en un teclado grande.
import { useActionState, useState } from "react";
import type { EstadoForm } from "@/lib/acciones";
import { Alerta, Boton, cx } from "@/components/ui";

type Props = {
  barberos: { id: string; name: string }[];
  siguiente: string;
  accion: (previo: EstadoForm, fd: FormData) => Promise<EstadoForm>;
};

export function IngresoPin({ barberos, siguiente, accion }: Props) {
  const [estado, enviar, enviando] = useActionState(accion, {});
  const [barberId, setBarberId] = useState(barberos.length === 1 ? barberos[0].id : "");
  const [pin, setPin] = useState("");
  const elegido = barberos.find((b) => b.id === barberId);

  if (!elegido) {
    return (
      <div className="space-y-3">
        <p className="text-center text-sm text-slate-600">¿Quién eres?</p>
        {barberos.map((b) => (
          <Boton key={b.id} type="button" variante="secundario" tamano="xl" onClick={() => { setBarberId(b.id); setPin(""); }}>
            {b.name}
          </Boton>
        ))}
      </div>
    );
  }

  const tecla = (d: string) => setPin((p) => (p.length < 6 ? p + d : p));

  return (
    <form action={enviar} className="space-y-4">
      <input type="hidden" name="barberId" value={barberId} />
      <input type="hidden" name="siguiente" value={siguiente} />
      <input type="hidden" name="pin" value={pin} />
      <p className="text-center text-sm text-slate-600">
        Hola, <strong>{elegido.name}</strong>. Ingresa tu PIN.
      </p>
      {estado.error && <Alerta tono="error">{estado.error}</Alerta>}
      <div className="flex justify-center gap-3" aria-label={`PIN: ${pin.length} dígitos ingresados`}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i} className={cx("h-4 w-4 rounded-full border-2 border-slate-400", i < pin.length && "border-marca bg-marca", i >= 4 && i >= pin.length && "opacity-30")} />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <Boton key={d} type="button" variante="secundario" className="py-5 text-2xl" onClick={() => tecla(d)}>{d}</Boton>
        ))}
        <Boton type="button" variante="fantasma" className="py-5" onClick={() => setPin("")}>Borrar</Boton>
        <Boton type="button" variante="secundario" className="py-5 text-2xl" onClick={() => tecla("0")}>0</Boton>
        <Boton type="button" variante="fantasma" className="py-5" aria-label="Borrar último dígito" onClick={() => setPin((p) => p.slice(0, -1))}>⌫</Boton>
      </div>
      <Boton type="submit" tamano="xl" disabled={pin.length < 4 || enviando}>{enviando ? "Ingresando…" : "Ingresar"}</Boton>
      {barberos.length > 1 && (
        <button type="button" className="block w-full text-center text-sm text-slate-600 underline" onClick={() => { setBarberId(""); setPin(""); }}>
          No soy {elegido.name}
        </button>
      )}
    </form>
  );
}
