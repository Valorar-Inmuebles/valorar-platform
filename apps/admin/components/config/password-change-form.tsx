"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ErrorMessage, FormField, Label } from "@repo/ui/form-field";
import { Input } from "@repo/ui/input";
import { useToast } from "@repo/ui/toast";
import { changePasswordAction } from "@/lib/api/password-actions";
import {
  mapPasswordChangeError,
  passwordPolicy,
  validatePasswordChange,
  type PasswordChangeFailure,
  type PasswordErrors,
  type PasswordField,
  type PasswordValues,
} from "@/lib/profile/password-change";
import { PasswordStrengthMeter } from "./password-strength-meter";

const EMPTY: PasswordValues = {
  currentPassword: "",
  newPassword: "",
  confirmation: "",
};
const FIELDS: { name: PasswordField; label: string; autoComplete: string }[] = [
  {
    name: "currentPassword",
    label: "Contraseña actual",
    autoComplete: "current-password",
  },
  {
    name: "newPassword",
    label: "Nueva contraseña",
    autoComplete: "new-password",
  },
  {
    name: "confirmation",
    label: "Confirmar nueva contraseña",
    autoComplete: "new-password",
  },
];

export function PasswordChangeForm() {
  const id = useId();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const inFlight = useRef(false);
  const [values, setValues] = useState<PasswordValues>(EMPTY);
  const [visible, setVisible] = useState<
    Partial<Record<PasswordField, boolean>>
  >({});
  const [errors, setErrors] = useState<PasswordErrors>({});
  const [failure, setFailure] = useState<PasswordChangeFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [waitUntil, setWaitUntil] = useState<number | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const policy = passwordPolicy(values.newPassword);

  useEffect(() => {
    if (waitUntil === null) return;
    const update = () => {
      const remaining = Math.max(0, Math.ceil((waitUntil - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (!remaining) {
        setWaitUntil(null);
        setFailure((previous) =>
          previous?.code === "PASSWORD_CHANGE_RATE_LIMITED" ? null : previous,
        );
      }
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [waitUntil]);

  function focusField(name: PasswordField) {
    const field = formRef.current?.elements.namedItem(name);
    if (field instanceof HTMLInputElement) field.focus();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || (waitUntil !== null && waitUntil > Date.now()))
      return;
    const validation = validatePasswordChange(values);
    setErrors(validation);
    setFailure(null);
    const firstError = FIELDS.find((field) => validation[field.name]);
    if (firstError) {
      focusField(firstError.name);
      return;
    }
    inFlight.current = true;
    setPending(true);
    try {
      const result = await changePasswordAction({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      if (result.ok) {
        setValues(EMPTY);
        setVisible({});
        setErrors({});
        toast.success("Contraseña actualizada. Tu sesión sigue activa.");
      } else {
        showFailure(result);
      }
    } catch {
      showFailure(mapPasswordChangeError(503, null));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  function showFailure(result: PasswordChangeFailure) {
    setFailure(result);
    if (result.field) setErrors({ [result.field]: result.message });
    if (result.retryAfterSeconds) {
      setSecondsLeft(result.retryAfterSeconds);
      setWaitUntil(Date.now() + result.retryAfterSeconds * 1000);
    }
    toast.error(result.message);
  }

  return (
    <Card className="min-w-0" aria-labelledby={`${id}-title`}>
      <CardHeader>
        <CardTitle id={`${id}-title`}>Seguridad de la cuenta</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          ref={formRef}
          aria-labelledby={`${id}-title`}
          noValidate
          onSubmit={handleSubmit}
          className="space-y-5"
          aria-busy={pending}
        >
          <p className="text-sm text-muted">
            Cambiá tu contraseña sin cerrar tu sesión actual. Las demás sesiones
            abiertas seguirán activas.
          </p>
          {FIELDS.map(({ name, label, autoComplete }) => (
            <div key={name} className="space-y-3">
              <FormField
                id={`${id}-${name}`}
                state={errors[name] ? "error" : "default"}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label required>{label}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`${visible[name] ? "Ocultar" : "Mostrar"} ${name === "confirmation" ? "confirmación de contraseña" : label.toLowerCase()}`}
                    aria-pressed={Boolean(visible[name])}
                    aria-controls={`${id}-${name}`}
                    disabled={pending}
                    onClick={() =>
                      setVisible((previous) => ({
                        ...previous,
                        [name]: !previous[name],
                      }))
                    }
                  >
                    {visible[name] ? "Ocultar" : "Mostrar"}
                  </Button>
                </div>
                <Input
                  name={name}
                  type={visible[name] ? "text" : "password"}
                  autoComplete={autoComplete}
                  autoCapitalize="none"
                  spellCheck={false}
                  required
                  disabled={pending}
                  value={values[name]}
                  aria-describedby={
                    [
                      errors[name] ? `${id}-${name}-error` : "",
                      name === "newPassword" ? `${id}-policy` : "",
                    ]
                      .filter(Boolean)
                      .join(" ") || undefined
                  }
                  onChange={(event) => {
                    const value = event.target.value;
                    setValues((previous) => ({ ...previous, [name]: value }));
                    setErrors((previous) => ({
                      ...previous,
                      [name]: undefined,
                      ...(name === "newPassword"
                        ? { confirmation: undefined }
                        : {}),
                    }));
                  }}
                />
                {errors[name] && <ErrorMessage>{errors[name]}</ErrorMessage>}
              </FormField>
              {name === "newPassword" && (
                <>
                  <div
                    id={`${id}-policy`}
                    className="space-y-1 text-xs text-muted"
                  >
                    <p>
                      Mínimo 12 caracteres y máximo 72 bytes UTF-8. No puede
                      contener sólo espacios ni ser igual a la actual.
                    </p>
                    <p>
                      Los acentos y emojis pueden ocupar varios bytes.{" "}
                      {policy.characters} caracteres · {policy.bytes}/72 bytes.
                    </p>
                  </div>
                  <PasswordStrengthMeter value={values.newPassword} />
                </>
              )}
            </div>
          ))}
          {failure && !failure.field && (
            <ErrorMessage>{failure.message}</ErrorMessage>
          )}
          {secondsLeft > 0 && (
            <p role="timer" aria-live="off" className="text-sm text-muted">
              Podés volver a intentar en {Math.floor(secondsLeft / 60)}:
              {String(secondsLeft % 60).padStart(2, "0")}.
            </p>
          )}
          <div className="flex justify-end">
            <Button
              type="submit"
              loading={pending}
              disabled={secondsLeft > 0}
              className="w-full sm:w-auto"
            >
              {pending ? "Cambiando…" : "Cambiar contraseña"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
