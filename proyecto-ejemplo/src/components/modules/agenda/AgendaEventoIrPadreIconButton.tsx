"use client";

import type { MouseEvent } from "react";
import { useRouter } from "next/navigation";

import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { Tooltip } from "@/components/ui/tooltip";
import { AGENDA_EVENTO_ICON_TOOLTIP_Z_INDEX } from "@/lib/agenda/agenda-evento-tooltip";
import { getAgendaEventoPadreLabel } from "@/lib/agenda/agenda-evento-padre-label";
import type { AgendaEventoPadreDto } from "@/lib/types/agenda";

type Props = {
  padre: AgendaEventoPadreDto;
  className?: string;
  iconClassName?: string;
  onNavigate?: () => void;
};

export function AgendaEventoIrPadreIconButton({
  padre,
  className = "",
  iconClassName = "size-3",
  onNavigate,
}: Props) {
  const router = useRouter();
  const label = getAgendaEventoPadreLabel(padre);

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    onNavigate?.();
    router.push(padre.ruta);
  }

  return (
    <Tooltip content={label} zIndex={AGENDA_EVENTO_ICON_TOOLTIP_Z_INDEX}>
      <ActionIconButton
        type="button"
        className={className}
        aria-label={label}
        onClick={handleClick}
      >
        <Icon.FolderSearch className={iconClassName} />
      </ActionIconButton>
    </Tooltip>
  );
}
