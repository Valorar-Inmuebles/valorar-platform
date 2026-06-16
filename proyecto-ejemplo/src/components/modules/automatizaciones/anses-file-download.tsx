"use client";

import { useCallback, useState, type ReactNode } from "react";

import { downloadFileFromUrl } from "@/lib/api/download-file";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Button, type ButtonSize, type ButtonVariant } from "@/components/ui/button";
import { Icon } from "@/components/ui/icons";
import { Spinner } from "@/components/ui/spinner";
import { useToast } from "@/components/ui/toast";

type AnsesFileDownloadVariant = "icon" | "text-link" | "button";

type AnsesFileDownloadProps = {
  url: string;
  filename?: string;
  variant?: AnsesFileDownloadVariant;
  label?: ReactNode;
  className?: string;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
  "aria-label"?: string;
};

export function AnsesFileDownload({
  url,
  filename,
  variant = "text-link",
  label,
  className = "",
  buttonVariant = "ghost",
  buttonSize = "sm",
  "aria-label": ariaLabel,
}: AnsesFileDownloadProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      await downloadFileFromUrl(url, filename);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Error al descargar archivo");
    } finally {
      setLoading(false);
    }
  }, [filename, toast, url]);

  if (variant === "icon") {
    return (
      <ActionIconButton
        type="button"
        aria-label={ariaLabel ?? "Descargar archivo"}
        aria-busy={loading || undefined}
        disabled={loading}
        className={className}
        onClick={() => void handleDownload()}
      >
        {loading ? <Spinner size="sm" /> : <Icon.Download className="size-3.5" />}
      </ActionIconButton>
    );
  }

  if (variant === "button") {
    return (
      <Button
        type="button"
        variant={buttonVariant}
        size={buttonSize}
        loading={loading}
        className={className}
        onClick={() => void handleDownload()}
      >
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-busy={loading || undefined}
      disabled={loading}
      className={`inline-flex items-center gap-1 text-xs text-blue-600 transition-opacity hover:underline disabled:pointer-events-none disabled:opacity-60 ${className}`}
      onClick={() => void handleDownload()}
    >
      {loading ? (
        <Spinner size="sm" className="text-blue-600" />
      ) : (
        <Icon.Download className="size-3.5 shrink-0" />
      )}
      {label}
    </button>
  );
}
