"use client";

import { useState } from "react";
import { SystemIcon } from "@repo/icons";
import { Input, type InputProps } from "./input";
import { Button } from "./button";

export function CopyInput({
  value,
  copyLabel,
  ...props
}: Omit<InputProps, "value" | "rightIcon"> & {
  value: string;
  copyLabel: string;
}) {
  const [feedback, setFeedback] = useState("");
  return (
    <div className="space-y-1">
      <Input
        {...props}
        value={value}
        className={`pr-12 ${props.className ?? ""}`}
        rightIcon={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="pointer-events-auto w-6 px-0"
            aria-label={copyLabel}
            title={copyLabel}
            disabled={props.disabled || !value}
            onClick={async () => {
              setFeedback("");
              try {
                await navigator.clipboard.writeText(value);
                setFeedback("Copiado al portapapeles.");
              } catch {
                setFeedback(
                  "No se pudo copiar. Seleccioná el texto y copialo manualmente.",
                );
              }
            }}
          >
            <SystemIcon name="copy" className="size-3.5" />
          </Button>
        }
      />
      <p role="status" aria-live="polite" className="text-xs text-muted">
        {feedback}
      </p>
    </div>
  );
}
