"use client";
// Formulario de registro del cliente. Valida en el navegador con el MISMO
// esquema que usa el servidor (que vuelve a validar al recibir los datos).
import Link from "next/link";
import { useState } from "react";
import { BotonEnviar, Formulario } from "@/components/formulario";
import { Alerta, Campo, CLASE_INPUT } from "@/components/ui";
import type { EstadoForm } from "@/lib/acciones";
import { MESES } from "@/lib/fechas";
import { primerError, registroClienteSchema } from "@/lib/validacion/esquemas";

type Props = {
  slug: string;
  nombreBarberia: string;
  accion: (previo: EstadoForm, fd: FormData) => Promise<EstadoForm>;
};

export function FormularioRegistro({ slug, nombreBarberia, accion }: Props) {
  const [errorLocal, setErrorLocal] = useState("");

  return (
    <Formulario
      accion={accion}
      noValidate
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const r = registroClienteSchema.safeParse({
          nombre: fd.get("nombre"),
          celular: fd.get("celular"),
          cumpleDia: fd.get("cumpleDia") || undefined,
          cumpleMes: fd.get("cumpleMes") || undefined,
          aceptaPrivacidad: fd.get("aceptaPrivacidad") === "on",
          aceptaWhatsapp: fd.get("aceptaWhatsapp") === "on",
        });
        if (!r.success) {
          e.preventDefault();
          setErrorLocal(primerError(r.error));
        } else {
          setErrorLocal("");
        }
      }}
    >
      {errorLocal && <Alerta tono="error">{errorLocal}</Alerta>}
      <Campo etiqueta="Tu nombre" name="nombre" autoComplete="name" placeholder="Ej. Luis Ramírez" required maxLength={80} />
      <Campo
        etiqueta="Celular (WhatsApp)" name="celular" type="tel" inputMode="numeric" autoComplete="tel-national"
        placeholder="9XX XXX XXX" required maxLength={15} ayuda="9 dígitos, empieza con 9."
      />
      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-slate-700">Cumpleaños <span className="font-normal text-slate-500">(opcional)</span></legend>
        <div className="grid grid-cols-2 gap-3">
          <select name="cumpleDia" aria-label="Día de cumpleaños" className={CLASE_INPUT} defaultValue="">
            <option value="">Día</option>
            {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
          </select>
          <select name="cumpleMes" aria-label="Mes de cumpleaños" className={CLASE_INPUT} defaultValue="">
            <option value="">Mes</option>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m[0].toUpperCase() + m.slice(1)}</option>)}
          </select>
        </div>
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="aceptaPrivacidad" required className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400" />
        <span>
          He leído y acepto la{" "}
          <Link href={`/${slug}/privacidad`} target="_blank" className="font-semibold underline">política de privacidad</Link>{" "}
          y el tratamiento de mis datos personales (Ley N.° 29733). <span className="text-red-600">*</span>
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-slate-700">
        <input type="checkbox" name="aceptaWhatsapp" className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-400" />
        <span>Acepto recibir mensajes de {nombreBarberia} por WhatsApp (recordatorios y promociones). <span className="text-slate-500">Opcional.</span></span>
      </label>

      <BotonEnviar variante="acento" tamano="xl" textoEnviando="Creando tu tarjeta…">Obtener mi tarjeta</BotonEnviar>
    </Formulario>
  );
}
