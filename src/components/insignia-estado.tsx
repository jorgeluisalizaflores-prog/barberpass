import type { ResumenSuscripcion } from "@/lib/suscripcion/estado";
import { Insignia } from "./ui";

const TONO = { PRUEBA: "azul", ACTIVA: "verde", EN_GRACIA: "rojo", VENCIDA: "rojo", SUSPENDIDA: "gris" } as const;

export function InsigniaEstado({ s }: { s: ResumenSuscripcion }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <Insignia tono={TONO[s.estado]}>{s.etiqueta}{s.estado === "EN_GRACIA" ? " (en gracia)" : ""}</Insignia>
      {s.porVencer && <Insignia tono="ambar">Por vencer</Insignia>}
    </span>
  );
}
