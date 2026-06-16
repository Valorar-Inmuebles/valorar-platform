"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  deleteDocumento,
  getDocumentos,
  uploadDocumento,
  type DocumentoUploadError,
} from "@/lib/api/documentos.api";
import type { DocumentoDto, DocumentoUiEntidadTipo } from "@/lib/types/documento";

export function useDocumentos(
  entidadTipo: DocumentoUiEntidadTipo,
  entidadId: string,
  enabled: boolean,
) {
  const [documentos, setDocumentos] = useState<DocumentoDto[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadPending, setUploadPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!enabled || !entidadId) return;

    setLoading(true);
    setLoadError(null);

    try {
      const data = await getDocumentos(entidadTipo, entidadId);
      setDocumentos(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los documentos";
      setLoadError(message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [enabled, entidadId, entidadTipo]);

  useEffect(() => {
    if (!enabled || !entidadId) {
      setDocumentos([]);
      setLoading(false);
      setLoadError(null);
      return;
    }

    let cancelled = false;

    void (async () => {
      setLoading(true);
      setLoadError(null);
      setDocumentos([]);

      try {
        const data = await getDocumentos(entidadTipo, entidadId);
        if (!cancelled) setDocumentos(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "No se pudieron cargar los documentos",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, entidadId, entidadTipo]);

  const upload = useCallback(
    async (payload: {
      file: File;
      nombre_visible?: string;
      descripcion?: string;
    }) => {
      if (!entidadId) throw new Error("Entidad no disponible");

      setUploadPending(true);
      try {
        const created = await uploadDocumento({
          file: payload.file,
          entidad_tipo: entidadTipo,
          entidad_id: entidadId,
          nombre_visible: payload.nombre_visible,
          descripcion: payload.descripcion,
        });
        setDocumentos((prev) => [created, ...prev]);
        return created;
      } finally {
        setUploadPending(false);
      }
    },
    [entidadId, entidadTipo],
  );

  const remove = useCallback(async (id: string) => {
    setDeletingId(id);
    try {
      await deleteDocumento(id);
      setDocumentos((prev) => prev.filter((d) => d.id !== id));
    } finally {
      setDeletingId(null);
    }
  }, []);

  return {
    documentos,
    loading,
    loadError,
    uploadPending,
    deletingId,
    refetch,
    upload,
    remove,
    isUploadError: (error: unknown): error is DocumentoUploadError =>
      typeof error === "object" &&
      error !== null &&
      "message" in error &&
      typeof (error as DocumentoUploadError).message === "string",
  };
}

export type UseDocumentosReturn = ReturnType<typeof useDocumentos>;
