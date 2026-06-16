"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import {
  SidePanel,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelDescription,
  SidePanelContent,
  SidePanelFooter,
} from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select } from "@/components/ui/select";
import { PhoneCountrySelect } from "./PhoneCountrySelect";
import { InputGroup, InputAffix } from "@/components/ui/input-group";
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";

import {
  contactoSchema,
  CANALES,
  CATEGORIAS,
  CANAL_LABELS,
  CATEGORIA_LABELS,
  type ContactoInput,
} from "@/lib/validation/schemas/persona-contacto.schema";

// ── Types ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ContactoInput) => Promise<void>;
  initialValues?: Partial<ContactoInput>;
  isPending?: boolean;
  mode: "create" | "edit";
};

// ── Option lists ──────────────────────────────────────────────────────────────

const CANAL_OPTIONS = CANALES.map((c) => ({ value: c, label: CANAL_LABELS[c] }));
const CATEGORIA_OPTIONS = CATEGORIAS.map((c) => ({ value: c, label: CATEGORIA_LABELS[c] }));

const CANAL_PLACEHOLDERS: Record<string, string> = {
  email: "nombre@ejemplo.com",
  telefono: "1131716941",
  whatsapp: "1131716941",
  web: "https://ejemplo.com",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ContactoSidePanel({
  open,
  onClose,
  onSubmit,
  initialValues,
  isPending = false,
  mode,
}: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<
    z.input<typeof contactoSchema>,
    any,
    z.output<typeof contactoSchema>
  >({
    resolver: zodResolver(contactoSchema),
    mode: "onBlur",
    defaultValues: {
      canal: "email",
      categoria: "personal",
      valor: "",
      descripcion: "",
      predeterminado: false,
      verificado: false,
      pais_codigo: "AR",
    },
  });

  const canal = watch("canal");
  const valor = watch("valor");

  // Reset form when panel opens or initialValues changes
  useEffect(() => {
    if (!open) return;
    reset({
      canal: initialValues?.canal ?? "email",
      categoria: initialValues?.categoria ?? "personal",
      valor: initialValues?.valor ?? "",
      descripcion: initialValues?.descripcion ?? "",
      predeterminado: initialValues?.predeterminado ?? false,
      verificado: initialValues?.verificado ?? false,
      pais_codigo: initialValues?.pais_codigo ?? "AR",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialValues]);

  // Re-validate valor when canal changes (validation rules change per canal)
  useEffect(() => {
    if (valor) trigger("valor");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canal]);

  async function handleFormSubmit(data: ContactoInput) {
    await onSubmit(data);
    onClose();
  }

  return (
    <SidePanel open={open} onClose={onClose} width="sm">
      <SidePanelHeader>
        <SidePanelTitle>
          {mode === "create" ? "Agregar contacto" : "Editar contacto"}
        </SidePanelTitle>
        <SidePanelDescription>
          {mode === "create"
            ? "Completá los datos del nuevo medio de contacto."
            : "Modificá los datos del medio de contacto."}
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent>
        <form
          id="contacto-form"
          onSubmit={(e) => { e.stopPropagation(); handleSubmit(handleFormSubmit)(e); }}
          className="space-y-4"
        >
          {/* Canal */}
          <FormField id="canal" state={errors.canal ? "error" : "default"}>
            <Label required>Canal</Label>
            <Controller
              name="canal"
              control={control}
              render={({ field }) => (
                <Select
                  options={CANAL_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccionar canal…"
                  state={errors.canal ? "error" : "default"}
                />
              )}
            />
            {errors.canal && (
              <ErrorMessage>{errors.canal.message}</ErrorMessage>
            )}
          </FormField>

          {/* Categoría */}
          <FormField id="categoria" state={errors.categoria ? "error" : "default"}>
            <Label required>Categoría</Label>
            <Controller
              name="categoria"
              control={control}
              render={({ field }) => (
                <Select
                  options={CATEGORIA_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="Seleccionar categoría…"
                  state={errors.categoria ? "error" : "default"}
                />
              )}
            />
            {errors.categoria && (
              <ErrorMessage>{errors.categoria.message}</ErrorMessage>
            )}
          </FormField>

          {/* Valor */}
          <FormField id="valor" state={errors.valor ? "error" : "default"}>
            <Label required>
              {canal === "email"
                ? "Dirección de email"
                : canal === "telefono"
                ? "Número de teléfono"
                : canal === "whatsapp"
                ? "Número de WhatsApp"
                : "URL"}
            </Label>

            {canal === "telefono" || canal === "whatsapp" ? (
            <div className="flex w-full">
              <div className="w-[7rem] shrink-0">
                <Controller
                  name="pais_codigo"
                  control={control}
                  render={({ field }) => (
                    <PhoneCountrySelect
                      value={field.value ?? "AR"}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            
              <div className="flex-1">
                <Input
                  {...register("valor")}
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="1131716941"
                  className="w-full rounded-l-none border-l-0"
                />
              </div>
            </div>
            ) : (
              <Input
                {...register("valor")}
                type={canal === "email" ? "email" : canal === "web" ? "url" : "text"}
                placeholder={CANAL_PLACEHOLDERS[canal] ?? ""}
              />
            )}

            {errors.valor ? (
              <ErrorMessage>{errors.valor.message}</ErrorMessage>
            ) : (
              <HelperText>
                {canal === "telefono" || canal === "whatsapp"
                  ? "Solo dígitos, sin código de país. Ej: 1131716941"
                  : canal === "web"
                  ? "Debe comenzar con https://"
                  : ""}
              </HelperText>
            )}
          </FormField>

          {/* Descripción */}
          <FormField id="descripcion" state="default">
            <Label>Descripción</Label>
            <Input
              {...register("descripcion")}
              placeholder="Ej: Trabajo, interno, etc."
            />
            <HelperText>Opcional. Referencia interna.</HelperText>
          </FormField>

          {/* Predeterminado */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Predeterminado</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Se mostrará como contacto principal de este canal.
              </p>
            </div>
            <Controller
              name="predeterminado"
              control={control}
              render={({ field }) => (
                <Switch
                  size="sm"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>

          {/* Verificado */}
          <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">Verificado</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                El dato fue confirmado como válido.
              </p>
            </div>
            <Controller
              name="verificado"
              control={control}
              render={({ field }) => (
                <Switch
                  size="sm"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
          </div>
        </form>
      </SidePanelContent>

      <SidePanelFooter>
        <Button variant="secondary" type="button" onClick={onClose} disabled={isPending}>
          Cancelar
        </Button>
        <Button form="contacto-form" type="submit" loading={isPending}>
          {mode === "create" ? "Agregar" : "Guardar"}
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
