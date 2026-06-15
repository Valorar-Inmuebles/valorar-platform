"use client";

import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { IconChevronRight } from "@/components/ui/icons";
import type { AgendaViewMode } from "@/lib/agenda/agenda-view-range";

type Props = {
  view: AgendaViewMode;
  title: string;
  onViewChange: (view: AgendaViewMode) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

const VIEW_OPTIONS: { value: AgendaViewMode; label: string }[] = [
  { value: "day", label: "Día" },
  { value: "week", label: "Semana" },
  { value: "month", label: "Mes" },
];

export function AgendaToolbar({
  view,
  title,
  onViewChange,
  onPrev,
  onNext,
  onToday,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-0.5">
          <ActionIconButton aria-label="Período anterior" onClick={onPrev}>
            <IconChevronRight className="size-4 rotate-180" />
          </ActionIconButton>
          <ActionIconButton aria-label="Período siguiente" onClick={onNext}>
            <IconChevronRight className="size-4" />
          </ActionIconButton>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={onToday}>
          Hoy
        </Button>
        <h2 className="text-sm font-semibold capitalize text-zinc-900">{title}</h2>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-zinc-300 p-0.5">
        {VIEW_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            type="button"
            size="sm"
            variant={view === opt.value ? "outline-primary" : "ghost"}
            onClick={() => onViewChange(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
