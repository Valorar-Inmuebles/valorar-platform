"use client";

import { useState } from "react";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { DniInput } from "@/components/ui/dni-input";
import { CuitInput } from "@/components/ui/cuit-input";
import { PhoneInput } from "@/components/ui/phone-input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateInput } from "@/components/ui/date-input";

// ── Section helpers (match ui-kit page style) ─────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

// ── RHF + Zod schema for the live demo form ───────────────────────────────────

const personaSchema = z.object({
  dni: z
    .string()
    .min(1, "El DNI es obligatorio")
    .regex(/^\d{7,8}$/, "DNI inválido — ingrese 7 u 8 dígitos"),
  cuit: z
    .string()
    .min(1, "El CUIT es obligatorio")
    .regex(/^\d{11}$/, "CUIT inválido — debe tener 11 dígitos"),
  telefono: z
    .string()
    .min(1, "El teléfono es obligatorio")
    .regex(/^\d{10,11}$/, "Teléfono inválido — ingrese 10 u 11 dígitos"),
  honorarios: z
    .number({ error: "Ingrese un monto" })
    .positive("El monto debe ser mayor a 0"),
  fechaNacimiento: z
    .string()
    .min(1, "La fecha es obligatoria")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida — use dd/mm/aaaa"),
});

type PersonaFormValues = {
  dni: string;
  cuit: string;
  telefono: string;
  honorarios: number | undefined;
  fechaNacimiento: string;
};

// ── Individual state previews ─────────────────────────────────────────────────

function InputPreviews() {
  const [dni, setDni] = useState<string | undefined>(undefined);
  const [cuit, setCuit] = useState<string | undefined>("20123456780");
  const [phone, setPhone] = useState<string | undefined>(undefined);
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [date, setDate] = useState<string | undefined>("1985-03-25");

  return (
    <div className="space-y-6">

      {/* DNI */}
      <div className="space-y-1.5">
        <SectionLabel>
          DniInput — display: "12.345.678" · stored: "12345678"
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField>
            <Label>DNI (vacío)</Label>
            <DniInput value={dni} onChange={setDni} />
            <HelperText>{dni ? `Valor: "${dni}"` : "Vacío"}</HelperText>
          </FormField>
          <FormField state="error">
            <Label required>DNI (error)</Label>
            <DniInput value="123" state="error" />
            <ErrorMessage>DNI inválido — ingrese 7 u 8 dígitos.</ErrorMessage>
          </FormField>
          <FormField>
            <Label>DNI (deshabilitado)</Label>
            <DniInput value="12345678" disabled />
            <HelperText>Solo lectura.</HelperText>
          </FormField>
        </div>
      </div>

      <Divider />

      {/* CUIT */}
      <div className="space-y-1.5">
        <SectionLabel>
          CuitInput — display: "20-12345678-0" · stored: "20123456780"
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField>
            <Label>CUIT (pre-cargado)</Label>
            <CuitInput value={cuit} onChange={setCuit} />
            <HelperText>{cuit ? `Valor: "${cuit}"` : "Vacío"}</HelperText>
          </FormField>
          <FormField state="error">
            <Label required>CUIT (error)</Label>
            <CuitInput value="2012345" state="error" />
            <ErrorMessage>CUIT inválido — debe tener 11 dígitos.</ErrorMessage>
          </FormField>
          <FormField>
            <Label>CUIT (deshabilitado)</Label>
            <CuitInput value="20123456780" disabled />
          </FormField>
        </div>
      </div>

      <Divider />

      {/* Phone */}
      <div className="space-y-1.5">
        <SectionLabel>
          PhoneInput — display: "011 4444-5678" · stored: "01144445678"
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField>
            <Label>Teléfono (vacío)</Label>
            <PhoneInput value={phone} onChange={setPhone} />
            <HelperText>{phone ? `Valor: "${phone}"` : "Vacío"}</HelperText>
          </FormField>
          <FormField state="error">
            <Label required>Teléfono (error)</Label>
            <PhoneInput value="011" state="error" />
            <ErrorMessage>Ingrese un teléfono válido.</ErrorMessage>
          </FormField>
          <FormField>
            <Label>Teléfono (deshabilitado)</Label>
            <PhoneInput value="01144445678" disabled />
          </FormField>
        </div>
      </div>

      <Divider />

      {/* Currency */}
      <div className="space-y-1.5">
        <SectionLabel>
          CurrencyInput — display: "$ 1.234,56" · stored: 1234.56 (number)
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-4">
          <FormField>
            <Label>Monto (vacío)</Label>
            <CurrencyInput value={amount} onChange={setAmount} />
            <HelperText>
              {amount != null ? `Valor: ${amount}` : "Vacío"}
            </HelperText>
          </FormField>
          <FormField>
            <Label>Monto (pre-cargado)</Label>
            <CurrencyInput value={15000.5} onChange={() => {}} />
          </FormField>
          <FormField state="error">
            <Label required>Monto (error)</Label>
            <CurrencyInput value={50} state="error" onChange={() => {}} />
            <ErrorMessage>El mínimo es $ 100,00.</ErrorMessage>
          </FormField>
          <FormField>
            <Label>Monto (deshabilitado)</Label>
            <CurrencyInput value={299.99} disabled />
          </FormField>
        </div>
      </div>

      <Divider />

      {/* Date */}
      <div className="space-y-1.5">
        <SectionLabel>
          DateInput — display: "25/03/1985" · stored: "1985-03-25" (ISO)
        </SectionLabel>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField>
            <Label>Fecha (pre-cargada)</Label>
            <DateInput value={date} onChange={setDate} />
            <HelperText>{date ? `Valor: "${date}"` : "Vacío"}</HelperText>
          </FormField>
          <FormField state="error">
            <Label required>Fecha (error)</Label>
            <DateInput value={undefined} state="error" />
            <ErrorMessage>Fecha inválida — use dd/mm/aaaa.</ErrorMessage>
          </FormField>
          <FormField>
            <Label>Fecha (deshabilitada)</Label>
            <DateInput value="1990-06-15" disabled />
          </FormField>
        </div>
      </div>

    </div>
  );
}

// ── RHF integration demo form ─────────────────────────────────────────────────

function RhfDemoForm() {
  const [submitted, setSubmitted] = useState<PersonaFormValues | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PersonaFormValues>({
    resolver: zodResolver(personaSchema) as Resolver<PersonaFormValues>,
    mode: "onBlur",
    defaultValues: {
      dni: "",
      cuit: "",
      telefono: "",
      honorarios: undefined,
      fechaNacimiento: "",
    },
  });

  function onSubmit(values: PersonaFormValues) {
    setSubmitted(values);
  }

  function handleReset() {
    setSubmitted(null);
    reset();
  }

  if (submitted) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4 shrink-0 text-emerald-500"
              aria-hidden
            >
              <circle cx="8" cy="8" r="6.25" />
              <polyline points="5,8.5 7,10.5 11,6" />
            </svg>
            <span className="text-sm font-medium text-emerald-700">
              Formulario enviado — valores raw almacenados:
            </span>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-emerald-600 underline-offset-2 hover:underline"
          >
            Reiniciar
          </button>
        </div>

        {/* Raw values table — demonstrates display vs stored value separation */}
        <div className="overflow-hidden rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50">
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  Campo
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  Valor almacenado (raw)
                </th>
                <th className="px-3 py-2 text-left font-medium text-zinc-500">
                  Tipo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              <tr>
                <td className="px-3 py-2 font-medium text-zinc-700">DNI</td>
                <td className="px-3 py-2 font-mono text-zinc-900">
                  {submitted.dni}
                </td>
                <td className="px-3 py-2 text-zinc-400">string</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-zinc-700">CUIT</td>
                <td className="px-3 py-2 font-mono text-zinc-900">
                  {submitted.cuit}
                </td>
                <td className="px-3 py-2 text-zinc-400">string</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-zinc-700">
                  Teléfono
                </td>
                <td className="px-3 py-2 font-mono text-zinc-900">
                  {submitted.telefono}
                </td>
                <td className="px-3 py-2 text-zinc-400">string</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-zinc-700">
                  Honorarios
                </td>
                <td className="px-3 py-2 font-mono text-zinc-900">
                  {submitted.honorarios ?? "—"}
                </td>
                <td className="px-3 py-2 text-zinc-400">number</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-medium text-zinc-700">
                  Fecha nacimiento
                </td>
                <td className="px-3 py-2 font-mono text-zinc-900">
                  {submitted.fechaNacimiento}
                </td>
                <td className="px-3 py-2 text-zinc-400">string (ISO)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="max-w-lg space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {/* DNI */}
        <Controller
          control={control}
          name="dni"
          render={({ field, fieldState }) => (
            <FormField state={fieldState.error ? "error" : "default"}>
              <Label required>DNI</Label>
              <DniInput
                value={field.value || undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                state={fieldState.error ? "error" : "default"}
              />
              {fieldState.error ? (
                <ErrorMessage>{fieldState.error.message}</ErrorMessage>
              ) : (
                <HelperText>Sin puntos — se formatean automáticamente.</HelperText>
              )}
            </FormField>
          )}
        />

        {/* CUIT */}
        <Controller
          control={control}
          name="cuit"
          render={({ field, fieldState }) => (
            <FormField state={fieldState.error ? "error" : "default"}>
              <Label required>CUIT</Label>
              <CuitInput
                value={field.value || undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                state={fieldState.error ? "error" : "default"}
              />
              {fieldState.error ? (
                <ErrorMessage>{fieldState.error.message}</ErrorMessage>
              ) : (
                <HelperText>Sin guiones — se formatean automáticamente.</HelperText>
              )}
            </FormField>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Phone */}
        <Controller
          control={control}
          name="telefono"
          render={({ field, fieldState }) => (
            <FormField state={fieldState.error ? "error" : "default"}>
              <Label required>Teléfono</Label>
              <PhoneInput
                value={field.value || undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                state={fieldState.error ? "error" : "default"}
              />
              {fieldState.error ? (
                <ErrorMessage>{fieldState.error.message}</ErrorMessage>
              ) : (
                <HelperText>Ej: 011 4444-5678</HelperText>
              )}
            </FormField>
          )}
        />

        {/* Fecha nacimiento */}
        <Controller
          control={control}
          name="fechaNacimiento"
          render={({ field, fieldState }) => (
            <FormField state={fieldState.error ? "error" : "default"}>
              <Label required>Fecha de nacimiento</Label>
              <DateInput
                value={field.value || undefined}
                onChange={field.onChange}
                onBlur={field.onBlur}
                state={fieldState.error ? "error" : "default"}
              />
              {fieldState.error ? (
                <ErrorMessage>{fieldState.error.message}</ErrorMessage>
              ) : (
                <HelperText>Formato dd/mm/aaaa</HelperText>
              )}
            </FormField>
          )}
        />
      </div>

      {/* Honorarios — full width */}
      <Controller
        control={control}
        name="honorarios"
        render={({ field, fieldState }) => (
          <FormField state={fieldState.error ? "error" : "default"}>
            <Label required>Honorarios</Label>
            <CurrencyInput
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              state={fieldState.error ? "error" : "default"}
            />
            {fieldState.error ? (
              <ErrorMessage>{fieldState.error.message}</ErrorMessage>
            ) : (
              <HelperText>
                Monto en pesos argentinos. Ej: $ 15.000,00
              </HelperText>
            )}
          </FormField>
        )}
      />

      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={isSubmitting}
        >
          Guardar persona
        </Button>
        <p className="text-xs text-zinc-400">
          Validación: <code className="font-mono">onBlur</code> · Submit
          fuerza validación completa.
        </p>
      </div>

      {/* Top-level form errors summary — shown after submit attempt */}
      {Object.keys(errors).length > 0 && (
        <p className="text-xs text-red-500">
          Hay {Object.keys(errors).length} campo
          {Object.keys(errors).length !== 1 ? "s" : ""} con error. Revisá los
          campos marcados arriba.
        </p>
      )}
    </form>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export function FormattedInputsShowcase() {
  return (
    <>
      {/* ── Individual state previews ── */}
      <Card flat>
        <CardHeader>
          <CardTitle>Formatted Inputs</CardTitle>
          <span className="font-mono text-xs text-zinc-400">
            DniInput · CuitInput · PhoneInput · CurrencyInput · DateInput
          </span>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs leading-relaxed text-zinc-500">
              All inputs share a single{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">
                useFormattedInput
              </code>{" "}
              hook. The display value (formatted) is local state; the stored
              value (raw/parsed) is emitted via{" "}
              <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">
                onChange
              </code>
              . Caret positioning is stable across re-renders. Backspace/Delete
              skip auto-inserted separators.
            </p>
          </div>
          <InputPreviews />
        </CardContent>
      </Card>

      {/* ── RHF integration demo ── */}
      <Card flat>
        <CardHeader>
          <CardTitle>Formulario real con RHF + Zod</CardTitle>
          <span className="font-mono text-xs text-zinc-400">
            Controller · zodResolver · onBlur · raw values
          </span>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs leading-relaxed text-zinc-500">
            Patrón estándar de integración:{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">
              &lt;Controller&gt;
            </code>{" "}
            pasa{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">
              field.value
            </code>{" "}
            (raw) al input y recibe el valor parseado de vuelta. RHF valida
            con Zod en{" "}
            <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">
              onBlur
            </code>
            . Al enviar, la tabla muestra los valores exactos que se
            persistirían.
          </p>
          <RhfDemoForm />
        </CardContent>
      </Card>
    </>
  );
}
