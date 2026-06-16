"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDocumentoBlob } from "@/lib/api/documentos.api";
import type { DocumentoDto } from "@/lib/types/documento";

import { canPreviewDocumento } from "../documento-helpers";

export function useDocumentoPreview(documento: DocumentoDto | null, open: boolean) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setObjectUrl(null);
  }, []);

  useEffect(() => {
    if (!open || !documento) {
      revokeUrl();
      setError(null);
      setLoading(false);
      return;
    }

    if (!canPreviewDocumento(documento)) {
      revokeUrl();
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError(null);
      revokeUrl();

      try {
        const { blob } = await fetchDocumentoBlob(documento.id);
        if (cancelled) return;

        const url = URL.createObjectURL(blob);
        objectUrlRef.current = url;
        setObjectUrl(url);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar la vista previa",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [documento, open, revokeUrl]);

  useEffect(() => {
    return () => {
      revokeUrl();
    };
  }, [revokeUrl]);

  const isPdf =
    documento?.mimeType === "application/pdf" ||
    documento?.extension?.toLowerCase() === "pdf";

  const isImage =
    documento != null &&
    !isPdf &&
    (documento.mimeType?.startsWith("image/") ||
      ["jpg", "jpeg", "png"].includes(documento.extension?.toLowerCase() ?? ""));

  return {
    objectUrl,
    loading,
    error,
    isPdf,
    isImage,
  };
}
