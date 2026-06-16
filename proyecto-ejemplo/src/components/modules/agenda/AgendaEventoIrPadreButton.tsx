"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { getAgendaEventoPadreLabel } from "@/lib/agenda/agenda-evento-padre-label";
import type { AgendaEventoPadreDto } from "@/lib/types/agenda";

type Props = {
  padre: AgendaEventoPadreDto;
  className?: string;
  onNavigate?: () => void;
};

export function AgendaEventoIrPadreButton({
  padre,
  className = "",
  onNavigate,
}: Props) {
  const router = useRouter();
  const label = getAgendaEventoPadreLabel(padre);

  function handleClick() {
    onNavigate?.();
    router.push(padre.ruta);
  }

  return (
    <Button
      type="button"
      variant="outline-primary"
      size="sm"
      className={`max-w-full ${className}`}
      onClick={handleClick}
    >
      <span className="truncate">{label}</span>
    </Button>
  );
}
