import type { AgendaEventoTipoDto } from "@/lib/types/agenda";

type Props = {
  tipo: AgendaEventoTipoDto;
  className?: string;
};

export function AgendaEventoTipoBadge({ tipo, className = "" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
      style={{
        backgroundColor: tipo.colorFondo,
        color: tipo.colorTexto,
      }}
    >
      {tipo.nombre}
    </span>
  );
}
