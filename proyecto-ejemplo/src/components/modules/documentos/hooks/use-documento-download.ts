"use client";

import { useCallback, useState } from "react";

import { getDocumentoDownloadUrl } from "@/lib/api/documentos.api";
import { downloadFileFromUrl } from "@/lib/api/download-file";
import { useToast } from "@/components/ui/toast";

export function useDocumentoDownload() {
  const { toast } = useToast();
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const download = useCallback(
    async (id: string, filename?: string) => {
      setDownloadingId(id);
      try {
        await downloadFileFromUrl(getDocumentoDownloadUrl(id), filename);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Error al descargar documento",
        );
        throw error;
      } finally {
        setDownloadingId(null);
      }
    },
    [toast],
  );

  return { downloadingId, download };
}
