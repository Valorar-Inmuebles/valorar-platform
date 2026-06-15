export type ProgressBarColor = "indigo" | "emerald" | "amber" | "red";

export type ProgressBarProps = {
  value: number;
  max?: number;
  label?: string;
  sublabel?: string;
  color?: ProgressBarColor;
};

const fillColor: Record<ProgressBarColor, string> = {
  indigo: "bg-indigo-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

export function ProgressBar({
  value,
  max = 100,
  label,
  sublabel,
  color = "indigo",
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="space-y-1.5">
      {(label != null || sublabel != null) && (
        <div className="flex items-center justify-between gap-2">
          {label != null && (
            <span className="text-xs font-medium text-zinc-700">{label}</span>
          )}
          {sublabel != null && (
            <span className="text-xs text-zinc-400">{sublabel}</span>
          )}
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ${fillColor[color]}`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
    </div>
  );
}
