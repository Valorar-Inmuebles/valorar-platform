import { apiFetch } from "@/lib/api/fetch";
export type DownloadFileResult = {
  contentType: string | null;
  filename: string | null;
};

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;

  const utf8Match = /filename\*=(?:UTF-8''|utf-8'')([^;\n]+)/i.exec(header);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return utf8Match[1].trim();
    }
  }

  const quotedMatch = /filename="([^"]+)"/i.exec(header);
  if (quotedMatch?.[1]) return quotedMatch[1];

  const unquotedMatch = /filename=([^;\n]+)/i.exec(header);
  if (unquotedMatch?.[1]) return unquotedMatch[1].trim();

  return null;
}

function resolveDownloadFilename(
  filename: string | undefined,
  contentDisposition: string | null,
): string | null {
  const trimmed = filename?.trim();
  if (trimmed) return trimmed;

  return parseContentDispositionFilename(contentDisposition);
}

export async function downloadFileFromUrl(
  url: string,
  filename?: string,
): Promise<DownloadFileResult> {
  const res = await apiFetch(url);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      typeof body.error === "string" ? body.error : "Error al descargar archivo",
    );
  }

  const contentType = res.headers.get("content-type");
  const resolvedFilename = resolveDownloadFilename(
    filename,
    res.headers.get("content-disposition"),
  );

  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  try {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    if (resolvedFilename) {
      anchor.download = resolvedFilename;
    }
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  return {
    contentType,
    filename: resolvedFilename,
  };
}
