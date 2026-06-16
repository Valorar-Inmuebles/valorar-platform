import type { DocumentoDto } from "@/lib/types/documento";

const PREVIEW_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png"]);
const PREVIEW_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

export function canPreviewDocumento(doc: DocumentoDto): boolean {
  const ext = doc.extension?.toLowerCase();
  if (ext && PREVIEW_EXTENSIONS.has(ext)) return true;
  if (doc.mimeType && PREVIEW_MIME_TYPES.has(doc.mimeType)) return true;
  return false;
}

export function formatDocumentoExtension(doc: DocumentoDto): string {
  if (doc.extension) return doc.extension.toUpperCase();
  if (doc.mimeType === "application/pdf") return "PDF";
  return "-";
}

export function formatDocumentoSize(bytes: number | null): string {
  if (bytes == null || bytes <= 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function deriveNombreVisibleFromFilename(filename: string): string {
  const base = filename.replace(/[/\\]/g, "").trim();
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return base || "Documento";
  return base.slice(0, dot).trim() || "Documento";
}

export const DOCUMENTO_ACCEPT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".zip",
  ".rar",
].join(",");

export const DOCUMENTO_MAX_BYTES = 25 * 1024 * 1024;
