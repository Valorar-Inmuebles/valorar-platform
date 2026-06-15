"use client";

import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import type { DocumentoDto } from "@/lib/types/documento";

import {
  canPreviewDocumento,
  formatDocumentoExtension,
  formatDocumentoSize,
} from "./documento-helpers";

type Props = {
  documentos: DocumentoDto[];
  downloadingId: string | null;
  deletingId: string | null;
  disabled?: boolean;
  onPreview: (documento: DocumentoDto) => void;
  onDownload: (documento: DocumentoDto) => void;
  onDelete: (id: string) => void;
};

export function DocumentosTable({
  documentos,
  downloadingId,
  deletingId,
  disabled = false,
  onPreview,
  onDownload,
  onDelete,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <TableHeader>
          <TableRow>
            <TableCell isHeader className="pl-5">
              Documento
            </TableCell>
            <TableCell isHeader>Tipo</TableCell>
            <TableCell isHeader>Subido por</TableCell>
            <TableCell isHeader>Fecha</TableCell>
            <TableCell isHeader align="right">
              Tamaño
            </TableCell>
            <TableCell isHeader align="right" className="pr-4">
              Acciones
            </TableCell>
          </TableRow>
        </TableHeader>
        <tbody>
          {documentos.map((documento) => {
            const isDownloading = downloadingId === documento.id;
            const isDeleting = deletingId === documento.id;
            const rowBusy = isDownloading || isDeleting;
            const previewable = canPreviewDocumento(documento);

            return (
              <TableRow
                key={documento.id}
                className={`relative transition-colors duration-200${rowBusy ? " pointer-events-none" : ""}`}
              >
                <TableCell className="pl-5">
                  <div className="flex items-start gap-2">
                    <Icon.File className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900">
                        {documento.nombreVisible}
                      </p>
                      {documento.descripcion && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">
                          {documento.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant="neutral">
                    {formatDocumentoExtension(documento)}
                  </Badge>
                </TableCell>

                <TableCell>
                  {documento.uploadedBy ? (
                    <div className="flex items-center gap-1.5">
                      <Avatar
                        usuarioId={documento.uploadedBy.id}
                        name={documento.uploadedBy.nombre}
                        size="sm"
                      />
                      <span className="text-xs text-zinc-600">
                        {documento.uploadedBy.nombre.split(" ")[0]}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-400">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <span className="text-xs text-zinc-500">
                    {formatDisplayDateTime(documento.createdAt)}
                  </span>
                </TableCell>

                <TableCell align="right">
                  <span className="text-xs tabular-nums text-zinc-500">
                    {formatDocumentoSize(documento.sizeBytes)}
                  </span>
                </TableCell>

                <TableCell align="right" className="pr-4">
                  <div className="flex items-center justify-end gap-0.5">
                    {previewable && (
                      <ActionIconButton
                        aria-label="Ver documento"
                        disabled={disabled}
                        onClick={() => onPreview(documento)}
                      >
                        <Icon.Eye className="size-4" />
                      </ActionIconButton>
                    )}

                    <ActionIconButton
                      aria-label="Descargar documento"
                      disabled={disabled}
                      onClick={() => onDownload(documento)}
                    >
                      {isDownloading ? (
                        <Spinner size="sm" />
                      ) : (
                        <Icon.Download />
                      )}
                    </ActionIconButton>

                    {documento.puedeEliminar && (
                      <ActionIconButton
                        variant="destructive"
                        aria-label="Eliminar documento"
                        disabled={disabled}
                        onClick={() => onDelete(documento.id)}
                      >
                        <Icon.Trash />
                      </ActionIconButton>
                    )}
                  </div>
                </TableCell>

                {rowBusy && (
                  <td
                    aria-hidden
                    className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-white/50 backdrop-blur-[0.5px] transition-opacity duration-200"
                  >
                    <Spinner size="sm" />
                  </td>
                )}
              </TableRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
