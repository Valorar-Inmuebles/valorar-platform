"use client";

import {
  SidePanel,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelDescription,
  SidePanelContent,
  SidePanelFooter,
} from "@/components/ui/side-panel";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import type { DocumentoDto } from "@/lib/types/documento";

import {
  formatDocumentoExtension,
  formatDocumentoSize,
} from "./documento-helpers";
import { useDocumentoPreview } from "./hooks/use-documento-preview";

type Props = {
  open: boolean;
  documento: DocumentoDto | null;
  downloadPending?: boolean;
  onClose: () => void;
  onDownload: (documento: DocumentoDto) => void;
};

export function DocumentoPreviewSidePanel({
  open,
  documento,
  downloadPending = false,
  onClose,
  onDownload,
}: Props) {
  const { objectUrl, loading, error, isPdf, isImage } = useDocumentoPreview(
    documento,
    open,
  );

  return (
    <SidePanel open={open} onClose={onClose} width="lg">
      <SidePanelHeader>
        <SidePanelTitle>{documento?.nombreVisible ?? "Documento"}</SidePanelTitle>
        <SidePanelDescription>
          {documento?.descripcion?.trim() ||
            "Vista previa del documento seleccionado."}
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent className="flex flex-col gap-4">
        {documento && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <div>
              <dt className="text-zinc-400">Tipo</dt>
              <dd className="font-medium text-zinc-800">
                {formatDocumentoExtension(documento)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Tamaño</dt>
              <dd className="font-medium text-zinc-800">
                {formatDocumentoSize(documento.sizeBytes)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Subido por</dt>
              <dd className="font-medium text-zinc-800">
                {documento.uploadedBy?.nombre ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-400">Fecha</dt>
              <dd className="font-medium text-zinc-800">
                {formatDisplayDateTime(documento.createdAt)}
              </dd>
            </div>
          </dl>
        )}

        <div className="min-h-[20rem] overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50">
          {loading && (
            <div className="flex h-[20rem] items-center justify-center">
              <Spinner size="md" />
            </div>
          )}

          {!loading && error && (
            <div className="flex h-[20rem] items-center justify-center px-6 text-center text-sm text-red-600">
              {error}
            </div>
          )}

          {!loading && !error && objectUrl && isPdf && (
            <iframe
              src={objectUrl}
              title={documento?.nombreVisible ?? "Vista previa PDF"}
              className="h-[min(70vh,36rem)] w-full bg-white"
            />
          )}

          {!loading && !error && objectUrl && isImage && (
            <div className="flex h-[min(70vh,36rem)] items-center justify-center p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={objectUrl}
                alt={documento?.nombreVisible ?? "Vista previa"}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}
        </div>
      </SidePanelContent>

      <SidePanelFooter>
        <Button variant="secondary" type="button" onClick={onClose}>
          Cerrar
        </Button>
        {documento && (
          <Button
            type="button"
            loading={downloadPending}
            onClick={() => onDownload(documento)}
          >
            Descargar
          </Button>
        )}
      </SidePanelFooter>
    </SidePanel>
  );
}
