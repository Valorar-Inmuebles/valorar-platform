import {
  passwordStrength,
  STRENGTH_LABELS,
} from "@/lib/profile/password-change";

export function PasswordStrengthMeter({ value }: { value: string }) {
  const level = passwordStrength(value);
  const label = STRENGTH_LABELS[level - 1];
  const color = [
    "bg-destructive",
    "bg-brand-orange",
    "bg-primary/60",
    "bg-primary",
  ][level - 1];
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted" aria-live="polite" aria-atomic="true">
        {value
          ? `Fortaleza orientativa: ${label}`
          : "Escribí una contraseña para estimar su fortaleza."}
      </p>
      {value && (
        <div
          role="meter"
          aria-label="Fortaleza orientativa de la contraseña"
          aria-valuemin={1}
          aria-valuemax={4}
          aria-valuenow={level}
          aria-valuetext={label}
          className="grid grid-cols-4 gap-1.5"
        >
          {[1, 2, 3, 4].map((step) => (
            <span
              key={step}
              aria-hidden="true"
              className={`h-1.5 rounded-full ${step <= level ? color : "bg-border"}`}
            />
          ))}
        </div>
      )}
      <p className="text-xs text-muted">
        Estimación local; no reemplaza los requisitos ni la validación del
        servidor.
      </p>
    </div>
  );
}
