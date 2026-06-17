"use client";

import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { Button } from "@repo/ui/button";
import { HelperText } from "@repo/ui/form-field";
import {
  ALLOWED_IMAGE_ACCEPT,
} from "@/lib/api/types/property-image";
import { validateImageFile } from "@/lib/property/image-upload";

type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
};

type PropertyImageUploaderProps = {
  disabled?: boolean;
  onUploadFiles: (files: File[]) => Promise<void>;
  isUploading?: boolean;
};

function createPendingUpload(file: File): PendingUpload {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}`,
    file,
    previewUrl: URL.createObjectURL(file),
    status: "pending",
  };
}

export function PropertyImageUploader({
  disabled = false,
  onUploadFiles,
  isUploading = false,
}: PropertyImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [previews, setPreviews] = useState<PendingUpload[]>([]);

  const handleFiles = async (fileList: FileList | File[]) => {
    setLocalError(null);
    const files = Array.from(fileList);

    if (files.length === 0) {
      return;
    }

    for (const file of files) {
      const validationError = validateImageFile(file);
      if (validationError) {
        setLocalError(validationError);
        return;
      }
    }

    const nextPreviews = files.map(createPendingUpload);
    setPreviews(nextPreviews);

    try {
      await onUploadFiles(files);
      setPreviews([]);
    } catch (error) {
      setLocalError(
        error instanceof Error
          ? error.message
          : "No se pudieron subir las imágenes.",
      );
    } finally {
      for (const preview of nextPreviews) {
        URL.revokeObjectURL(preview.previewUrl);
      }
    }
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    void handleFiles(files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    void handleFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled && !isUploading) setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={[
          "rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : "border-border bg-slate-50",
          disabled || isUploading ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        ].join(" ")}
        onClick={() => {
          if (!disabled && !isUploading) {
            inputRef.current?.click();
          }
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_IMAGE_ACCEPT}
          multiple
          className="hidden"
          disabled={disabled || isUploading}
          onChange={handleInputChange}
        />

        <p className="text-base font-medium text-foreground">
          Arrastrá imágenes aquí o hacé clic para seleccionar
        </p>
        <p className="mt-2 text-sm text-muted">
          JPG, PNG, WebP o GIF · máximo 10 MB por archivo
        </p>
        <div className="mt-4">
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || isUploading}
            onClick={(event) => {
              event.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {isUploading ? "Subiendo..." : "Seleccionar imágenes"}
          </Button>
        </div>
      </div>

      {previews.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {previews.map((preview) => (
            <div
              key={preview.id}
              className="overflow-hidden rounded-lg border border-border bg-white"
            >
              <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview.previewUrl}
                  alt={preview.file.name}
                  className="size-full object-cover"
                />
              </div>
              <p className="truncate px-3 py-2 text-xs text-muted">
                {preview.file.name}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {localError ? (
        <HelperText className="text-red-600">{localError}</HelperText>
      ) : null}

      <HelperText>
        Las imágenes se suben directamente al storage configurado y se guardan
        automáticamente en la galería.
      </HelperText>
    </div>
  );
}
