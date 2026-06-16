"use client";

import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
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
import {
  FormField,
  Label,
  HelperText,
  ErrorMessage,
} from "@/components/ui/form-field";
import { MESSAGES } from "@/lib/validation/common/messages";

import {
  deriveNombreVisibleFromFilename,
  DOCUMENTO_ACCEPT,
  DOCUMENTO_MAX_BYTES,
} from "./documento-helpers";

const textareaClassName =
  "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";

const documentoUploadFormSchema = z.object({
  nombre_visible: z
    .string()
    .trim()
    .min(1, MESSAGES.required)
    .max(255, MESSAGES.maxLength(255)),
  descripcion: z
    .string()
    .trim()
    .max(1000, MESSAGES.maxLength(1000))
    .optional(),
});

type DocumentoUploadFormValues = z.infer<typeof documentoUploadFormSchema>;

export type DocumentoUploadSubmitPayload = DocumentoUploadFormValues & {
  file: File;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: DocumentoUploadSubmitPayload) => Promise<void>;
  isPending?: boolean;
};

export function DocumentoSidePanel({
  open,
  onClose,
  onSubmit,
  isPending = false,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    setError,
    formState: { errors },
  } = useForm<DocumentoUploadFormValues>({
    resolver: zodResolver(documentoUploadFormSchema),
    mode: "onBlur",
    defaultValues: {
      nombre_visible: "",
      descripcion: "",
    },
  });

  useEffect(() => {
    if (!open) return;
    reset({ nombre_visible: "", descripcion: "" });
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [open, reset]);

  function validateFile(file: File): string | null {
    if (file.size === 0) return "El archivo está vacío.";
    if (file.size > DOCUMENTO_MAX_BYTES) {
      return "El archivo no puede superar 25 MB.";
    }
    const ext = file.name.includes(".")
      ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
      : "";
    const allowed = [
      "pdf",
      "jpg",
      "jpeg",
      "png",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "zip",
      "rar",
    ];
    if (!ext || !allowed.includes(ext)) {
      return "Tipo de archivo no permitido.";
    }
    return null;
  }

  function handleFileChange(file: File | null) {
    setFileError(null);
    if (!file) {
      setSelectedFile(null);
      return;
    }

    const validationError = validateFile(file);
    if (validationError) {
      setSelectedFile(null);
      setFileError(validationError);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    setValue("nombre_visible", deriveNombreVisibleFromFilename(file.name), {
      shouldValidate: true,
    });
  }

  async function handleFormSubmit(data: DocumentoUploadFormValues) {
    if (!selectedFile) {
      setFileError("Seleccioná un archivo.");
      return;
    }

    try {
      await onSubmit({ ...data, file: selectedFile });
      onClose();
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "field" in error &&
        (error as { field?: string }).field === "file" &&
        "message" in error
      ) {
        setFileError(String((error as { message: string }).message));
        return;
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "message" in error
      ) {
        setError("root", {
          message: String((error as { message: string }).message),
        });
      }
      throw error;
    }
  }

  return (
    <SidePanel open={open} onClose={onClose} width="sm">
      <SidePanelHeader>
        <SidePanelTitle>Subir documento</SidePanelTitle>
        <SidePanelDescription>
          Seleccioná un archivo y completá los datos visibles del documento.
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent>
        <form
          id="documento-upload-form"
          onSubmit={(e) => {
            e.stopPropagation();
            void handleSubmit(handleFormSubmit)(e);
          }}
          className="space-y-4"
        >
          <FormField id="file" state={fileError ? "error" : "default"}>
            <Label required>Archivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={DOCUMENTO_ACCEPT}
              disabled={isPending}
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-200 file:bg-zinc-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-zinc-700 hover:file:bg-zinc-100"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                handleFileChange(file);
              }}
            />
            {fileError ? (
              <ErrorMessage>{fileError}</ErrorMessage>
            ) : (
              <HelperText>
                PDF, imágenes, Office, ZIP o RAR. Máx. 25 MB.
              </HelperText>
            )}
          </FormField>

          <FormField
            id="nombre_visible"
            state={errors.nombre_visible ? "error" : "default"}
          >
            <Label required>Título</Label>
            <Input
              {...register("nombre_visible")}
              placeholder="Nombre visible del documento"
              disabled={isPending}
            />
            {errors.nombre_visible && (
              <ErrorMessage>{errors.nombre_visible.message}</ErrorMessage>
            )}
          </FormField>

          <FormField id="descripcion" state={errors.descripcion ? "error" : "default"}>
            <Label>Descripción</Label>
            <textarea
              {...register("descripcion")}
              rows={3}
              disabled={isPending}
              placeholder="Referencia o contexto interno"
              className={`${textareaClassName}${
                errors.descripcion ? " border-red-300 focus:border-red-400" : ""
              }`}
            />
            {errors.descripcion ? (
              <ErrorMessage>{errors.descripcion.message}</ErrorMessage>
            ) : (
              <HelperText>Opcional. Máx. 1000 caracteres.</HelperText>
            )}
          </FormField>

          {errors.root && (
            <p className="text-xs text-red-600">{errors.root.message}</p>
          )}
        </form>
      </SidePanelContent>

      <SidePanelFooter>
        <Button
          variant="secondary"
          type="button"
          onClick={onClose}
          disabled={isPending}
        >
          Cancelar
        </Button>
        <Button
          form="documento-upload-form"
          type="submit"
          loading={isPending}
        >
          Subir
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
