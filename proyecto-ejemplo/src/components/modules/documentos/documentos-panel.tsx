"use client";

import { useEffect, useState } from "react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardHeaderActions,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmModal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icons";
import type { DocumentoDto, DocumentoUiEntidadTipo } from "@/lib/types/documento";

import { DocumentoPreviewSidePanel } from "./documento-preview-side-panel";
import { DocumentoSidePanel } from "./documento-side-panel";
import { DocumentosTable } from "./documentos-table";
import { useDocumentoDownload } from "./hooks/use-documento-download";
import { useDocumentos } from "./hooks/use-documentos";

export type DocumentosPanelProps = {
  entidadTipo: DocumentoUiEntidadTipo;
  entidadId: string;
  /** Solo lectura: sin subir ni eliminar */
  disabled?: boolean;
  className?: string;
};

export function DocumentosPanel({
  entidadTipo,
  entidadId,
  disabled: readOnly = false,
  className = "",
}: DocumentosPanelProps) {
  const { toast } = useToast();

  const enabled = Boolean(entidadId);
  const mutationsDisabled = readOnly || !enabled;

  const {
    documentos,
    loading,
    loadError,
    uploadPending,
    deletingId,
    upload,
    remove,
    isUploadError,
  } = useDocumentos(entidadTipo, entidadId, enabled);

  const { downloadingId, download } = useDocumentoDownload();

  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewDocumento, setPreviewDocumento] = useState<DocumentoDto | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setUploadOpen(false);
    setPreviewDocumento(null);
    setDeleteId(null);
  }, [entidadTipo, entidadId]);

  useEffect(() => {
    if (loadError) {
      toast.error(loadError);
    }
  }, [loadError, toast]);

  async function handleUpload(payload: {
    file: File;
    nombre_visible: string;
    descripcion?: string;
  }) {
    try {
      await upload(payload);
      toast.success("Documento subido");
      setUploadOpen(false);
    } catch (error) {
      if (isUploadError(error)) {
        toast.error(error.message);
      } else if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("No se pudo subir el documento");
      }
      throw error;
    }
  }

  async function handleDownload(documento: DocumentoDto) {
    try {
      await download(documento.id, documento.nombreVisible);
    } catch {
      // toast handled in hook
    }
  }

  async function handleDeleteConfirm() {
    if (!deleteId || mutationsDisabled) return;
    const id = deleteId;
    setDeleteId(null);

    try {
      await remove(id);
      if (previewDocumento?.id === id) {
        setPreviewDocumento(null);
      }
      toast.success("Documento eliminado");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No se pudo eliminar el documento",
      );
    }
  }

  return (
    <>
      <ConfirmModal
        open={deleteId != null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => void handleDeleteConfirm()}
        loading={deletingId != null}
        title="Eliminar documento"
        description="¿Estás seguro que querés eliminar este documento?"
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <DocumentoSidePanel
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSubmit={handleUpload}
        isPending={uploadPending}
      />

      <DocumentoPreviewSidePanel
        open={previewDocumento != null}
        documento={previewDocumento}
        downloadPending={previewDocumento != null && downloadingId === previewDocumento.id}
        onClose={() => setPreviewDocumento(null)}
        onDownload={handleDownload}
      />

      <Card className={className}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Documentos</CardTitle>
            {documentos.length > 0 && (
              <Badge variant="neutral">{documentos.length}</Badge>
            )}
          </div>
          <CardHeaderActions>
            <Button
              variant="outline-primary"
              size="md"
              type="button"
              disabled={mutationsDisabled || Boolean(loadError)}
              onClick={() => setUploadOpen(true)}
              leftIcon={<Icon.PlusSm className="size-3.5" />}
            >
              Subir documento
            </Button>
          </CardHeaderActions>
        </CardHeader>

        {!enabled && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Guardá la entidad para adjuntar documentos.
          </div>
        )}

        {enabled && loading && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Cargando documentos…
          </div>
        )}

        {enabled && !loading && loadError && (
          <div className="px-5 py-6 text-center text-sm text-red-600">
            {loadError}
          </div>
        )}

        {enabled && !loading && !loadError && documentos.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-zinc-400">
            Sin documentos registrados
          </div>
        )}

        {enabled && !loading && !loadError && documentos.length > 0 && (
          <DocumentosTable
            documentos={documentos}
            downloadingId={downloadingId}
            deletingId={deletingId}
            disabled={mutationsDisabled}
            onPreview={setPreviewDocumento}
            onDownload={handleDownload}
            onDelete={setDeleteId}
          />
        )}
      </Card>
    </>
  );
}
