import type { ReactNode } from "react";

const ICON_CLASS = "block size-3.5 shrink-0";

/** Chevron 24×24 centrado — mismo path base que Lucide, sin translate ni viewBox custom. */
function ReorderChevronUp() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON_CLASS}
      aria-hidden
    >
      <path d="M6 15l6-6 6 6" />
    </svg>
  );
}

function ReorderChevronDown() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={ICON_CLASS}
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export type TableReorderControlsProps = {
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  reordering?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  upLabel?: string;
  downLabel?: string;
  className?: string;
};

const BUTTON_BASE =
  "flex h-5 min-h-5 w-full shrink-0 items-center justify-center rounded-none border-0 p-0 m-0 leading-[0] transition-colors";

const ICON_WRAPPER = "flex size-3.5 shrink-0 items-center justify-center";

function reorderButtonClassName(isDisabled: boolean): string {
  if (isDisabled) {
    return "cursor-not-allowed text-zinc-400 opacity-70 hover:bg-transparent";
  }

  return "text-zinc-600 opacity-100 hover:bg-zinc-50 hover:text-zinc-800";
}

function ReorderButton({
  disabled,
  onClick,
  label,
  showDivider,
  icon,
}: {
  disabled: boolean;
  onClick: () => void;
  label: string;
  showDivider?: boolean;
  icon: ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={`${BUTTON_BASE} ${showDivider ? "border-b border-zinc-200" : ""} ${reorderButtonClassName(disabled)}`}
    >
      <span className={ICON_WRAPPER}>{icon}</span>
    </button>
  );
}

export function TableReorderControls({
  canMoveUp,
  canMoveDown,
  disabled = false,
  reordering = false,
  onMoveUp,
  onMoveDown,
  upLabel = "Subir",
  downLabel = "Bajar",
  className = "",
}: TableReorderControlsProps) {
  const upDisabled = disabled || reordering || !canMoveUp;
  const downDisabled = disabled || reordering || !canMoveDown;

  return (
    <div
      className={`flex w-6 shrink-0 flex-col overflow-hidden rounded-md border border-zinc-200 bg-white ${className}`}
      role="group"
      aria-label="Reordenar"
    >
      <ReorderButton
        disabled={upDisabled}
        onClick={onMoveUp}
        label={upLabel}
        showDivider
        icon={<ReorderChevronUp />}
      />
      <ReorderButton
        disabled={downDisabled}
        onClick={onMoveDown}
        label={downLabel}
        icon={<ReorderChevronDown />}
      />
    </div>
  );
}
