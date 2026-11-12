"use client";
// Formulario conectado a una acción del servidor: muestra el error o el
// mensaje de éxito que devuelve la acción y deshabilita el botón mientras envía.
// A diferencia del comportamiento por defecto de React, NO borra lo que la
// persona escribió cuando la acción responde con un error.
import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoForm } from "@/lib/acciones";
import { Alerta, Boton } from "./ui";

type Accion = (previo: EstadoForm, formData: FormData) => Promise<EstadoForm>;

const Pendiente = createContext(false);

export function Formulario({
  accion, children, className, reiniciarAlExito = false, ...props
}: Omit<ComponentProps<"form">, "action"> & { accion: Accion; children: ReactNode; reiniciarAlExito?: boolean }) {
  const [estado, enviar, pendiente] = useActionState(accion, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (reiniciarAlExito && estado.ok) ref.current?.reset();
  }, [estado, reiniciarAlExito]);

  return (
    <form
      {...props}
      ref={ref}
      action={enviar}
      onSubmit={(e) => {
        if (e.defaultPrevented) return;
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => enviar(fd));
      }}
      className={className ?? "space-y-4"}
    >
      {estado.error && <Alerta tono="error">{estado.error}</Alerta>}
      {estado.ok && <Alerta tono="ok">{estado.ok}</Alerta>}
      <Pendiente.Provider value={pendiente}>{children}</Pendiente.Provider>
    </form>
  );
}

function usePendiente(): boolean {
  const deContexto = useContext(Pendiente);
  const { pending } = useFormStatus();
  return deContexto || pending;
}

export function BotonEnviar({ children, textoEnviando = "Enviando…", ...props }: ComponentProps<typeof Boton> & { textoEnviando?: string }) {
  const pendiente = usePendiente();
  return (
    <Boton type="submit" {...props} disabled={pendiente || props.disabled}>
      {pendiente ? textoEnviando : children}
    </Boton>
  );
}

/** Botón que pide confirmación antes de enviar su formulario. */
export function BotonConfirmar({ mensaje, children, ...props }: ComponentProps<typeof Boton> & { mensaje: string }) {
  const pendiente = usePendiente();
  return (
    <Boton
      type="submit"
      {...props}
      disabled={pendiente || props.disabled}
      onClick={(e) => {
        if (!window.confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </Boton>
  );
}
