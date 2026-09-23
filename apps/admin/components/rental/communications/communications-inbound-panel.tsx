"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { useToast } from "@repo/ui/toast";
import {
  acknowledgeInboundAction,
  markInboundReadAction,
} from "@/lib/api/rental-communications-actions";
import { formatDateTime } from "@/lib/rental/rental-ui";
import type { RentalInboundMessage } from "@repo/shared-types";

type Props = {
  message: RentalInboundMessage;
  canManage: boolean;
  onClose: () => void;
  onUpdated: (updated: RentalInboundMessage) => void;
};

const WHATSAPP_LINK_CLASSES =
  "inline-flex h-8 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 focus-visible:ring-2 focus-visible:ring-gray-500/20";

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Detalle de un mensaje entrante. No marca como leído al abrir: lectura y
 * atención son acciones explícitas. Sin metadata de proveedor.
 */
export function CommunicationsInboundPanel({
  message,
  canManage,
  onClose,
  onUpdated,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<"read" | "acknowledge" | null>(null);

  async function runAction(action: "read" | "acknowledge") {
    setPending(action);
    const result =
      action === "read"
        ? await markInboundReadAction(message.id)
        : await acknowledgeInboundAction(message.id);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { readAt, acknowledgedAt, acknowledgedBy } = result.value;
    onUpdated({ ...message, readAt, acknowledgedAt, acknowledgedBy });
    toast.success(
      action === "read"
        ? "Mensaje marcado como leído."
        : "Mensaje marcado como atendido.",
    );
    router.refresh();
  }

  const readMeta = message.readAt
    ? `Leído el ${formatDateTime(message.readAt)}`
    : null;
  const ackBy =
    message.acknowledgedAt && !message.acknowledgedBy
      ? "Atendido por un administrador"
      : message.acknowledgedBy
        ? `Atendido por ${message.acknowledgedBy.name}`
        : null;

  return (
    <SidePanel open onClose={onClose} width="md">
      <SidePanelHeader>
        <SidePanelTitle>Mensaje recibido</SidePanelTitle>
        <SidePanelDescription>
          Recibido el {formatDateTime(message.receivedAt)} por WhatsApp.
        </SidePanelDescription>
      </SidePanelHeader>

      <SidePanelContent className="space-y-5">
        <dl className="space-y-4">
          <DetailRow label="Contacto">
            {message.contact?.name ?? "Contacto no identificado"}
          </DetailRow>
          <DetailRow label="Contrato">
            {message.contract ? (
              <Link
                href={`/alquileres/${message.contract.id}`}
                className="font-medium text-primary hover:underline"
              >
                {message.contract.internalNumber}
              </Link>
            ) : (
              <span className="text-muted">—</span>
            )}
          </DetailRow>
          <DetailRow label="Teléfono">
            <span>{message.sender.address}</span>
          </DetailRow>
          <DetailRow label="Mensaje">
            <p className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-alt p-3 text-sm">
              {message.body || "Mensaje vacío"}
            </p>
          </DetailRow>
          <DetailRow label="Recibido">
            {formatDateTime(message.receivedAt)}
          </DetailRow>
          <DetailRow label="Leído">
            <span className="flex items-center gap-2">
              <Badge variant={message.readAt ? "neutral" : "info"}>
                {message.readAt ? "Leído" : "No leído"}
              </Badge>
              {readMeta ? (
                <span className="text-xs text-muted">{readMeta}</span>
              ) : null}
            </span>
          </DetailRow>
          <DetailRow label="Atendido">
            <span className="flex flex-wrap items-center gap-2">
              <Badge variant={message.acknowledgedAt ? "success" : "warning"}>
                {message.acknowledgedAt ? "Atendido" : "Pendiente"}
              </Badge>
              {message.acknowledgedAt ? (
                <span className="text-xs text-muted">
                  {ackBy}
                  {message.acknowledgedAt
                    ? ` · ${formatDateTime(message.acknowledgedAt)}`
                    : ""}
                </span>
              ) : null}
            </span>
          </DetailRow>
        </dl>
      </SidePanelContent>

      <SidePanelFooter>
        <div className="flex w-full flex-col gap-3">
          {message.externalReplyLink ? (
            <div className="space-y-1.5">
              <a
                href={message.externalReplyLink}
                target="_blank"
                rel="noopener noreferrer"
                className={WHATSAPP_LINK_CLASSES}
              >
                Responder por WhatsApp
              </a>
              <p className="text-xs text-muted">
                Se abre WhatsApp en una aplicación externa. Valorar no registra
                la conversación posterior.
              </p>
            </div>
          ) : null}
          {canManage ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                size="sm"
                variant="outline-primary"
                loading={pending === "read"}
                disabled={pending !== null && pending !== "read"}
                onClick={() => runAction("read")}
              >
                Marcar como leído
              </Button>
              <Button
                size="sm"
                variant="primary"
                loading={pending === "acknowledge"}
                disabled={pending !== null && pending !== "acknowledge"}
                onClick={() => runAction("acknowledge")}
              >
                Marcar como atendido
              </Button>
            </div>
          ) : null}
        </div>
      </SidePanelFooter>
    </SidePanel>
  );
}
