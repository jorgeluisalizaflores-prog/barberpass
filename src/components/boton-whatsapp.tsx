"use client";
// Botón que abre WhatsApp (wa.me) con un mensaje ya escrito. El dueño puede
// retocar el mensaje de ese cliente antes de abrirlo.
import { useState } from "react";
import { enlaceWhatsapp } from "@/lib/whatsapp";
import { claseBoton, CLASE_INPUT } from "./ui";

export function BotonWhatsapp({ celular, mensaje, nombre }: { celular: string; mensaje: string; nombre: string }) {
  const [texto, setTexto] = useState(mensaje);
  const [editando, setEditando] = useState(false);
  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      {editando && (
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={4} aria-label={`Mensaje para ${nombre}`} className={`${CLASE_INPUT} text-sm sm:w-80`} />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={() => setEditando((v) => !v)} className={claseBoton({ variante: "secundario", tamano: "sm" })}>
          {editando ? "Ocultar" : "Editar mensaje"}
        </button>
        <a href={enlaceWhatsapp(celular, texto)} target="_blank" rel="noopener noreferrer" className={claseBoton({ variante: "whatsapp", tamano: "sm" })}>
          WhatsApp
        </a>
      </div>
    </div>
  );
}
