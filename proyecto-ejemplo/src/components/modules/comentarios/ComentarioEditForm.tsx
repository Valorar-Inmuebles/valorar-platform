"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { ErrorMessage, FormField, Label } from "@/components/ui/form-field";
import { MESSAGES } from "@/lib/validation/common/messages";

const editSchema = z.object({
  contenido: z
    .string()
    .trim()
    .min(1, MESSAGES.required)
    .max(10000, MESSAGES.maxLength(10000)),
});

type EditValues = z.output<typeof editSchema>;

type Props = {
  initialContenido: string;
  saving: boolean;
  onCancel: () => void;
  onSave: (contenido: string) => Promise<void>;
};

export function ComentarioEditForm({
  initialContenido,
  saving,
  onCancel,
  onSave,
}: Props) {
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { contenido: initialContenido },
    mode: "onBlur",
  });

  const submit = form.handleSubmit(async (values) => {
    await onSave(values.contenido);
  });

  return (
    <form onSubmit={submit} className="mt-1 space-y-2" aria-busy={saving}>
      <FormField
        id="comentario-edit"
        state={form.formState.errors.contenido ? "error" : "default"}
      >
        <Label>Editar comentario</Label>
        <textarea
          {...form.register("contenido")}
          rows={3}
          readOnly={saving}
          className={`h-auto min-h-8 w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none transition-all duration-150 focus:ring-2 focus:ring-indigo-500/10 ${
            saving
              ? "cursor-wait border-zinc-200 bg-zinc-50 text-zinc-400 focus:border-zinc-200 focus:bg-zinc-50"
              : "border-zinc-200 text-zinc-900 focus:border-indigo-300"
          }`}
        />
        {form.formState.errors.contenido?.message && (
          <ErrorMessage>{form.formState.errors.contenido.message}</ErrorMessage>
        )}
      </FormField>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          disabled={saving}
          onClick={onCancel}
        >
          Cancelar
        </Button>
        <Button type="submit" size="md" loading={saving}>
          Guardar
        </Button>
      </div>
    </form>
  );
}
