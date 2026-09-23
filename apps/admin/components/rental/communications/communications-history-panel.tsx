"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { SystemIcon } from "@repo/icons";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  SidePanel,
  SidePanelContent,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelDescription,
  SidePanelTitle,
} from "@repo/ui/side-panel";
import { useToast } from "@repo/ui/toast";
import {
  acknowledgeInboundAction,
  markInboundReadAction,
} from "@/lib/api/rental-communications-actions";
import {
  buildDispatchStatusSummary,
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DELIVERY_STATUS_LABELS,
  DELIVERY_STATUS_BADGE_VARIANT,
  DISPATCH_STATUS_BADGE_VARIANT,
  DISPATCH_STATUS_LABELS,
  REMINDER_EVENT_LABELS,
} from "@/lib/rental/rental-communications";
import { formatDateOnly, formatDateTime } from "@/lib/rental/rental-ui";
import type {
  RentalDeliveryChannel,
  RentalDispatchHistoryDelivery,
  RentalDispatchHistoryItem,
  RentalDispatchPolicySnapshot,
  RentalDispatchResponse,
} from "@repo/shared-types";

type Props = {
  item: RentalDispatchHistoryItem;
  canManage: boolean;
  scope?: "global" | "contract";
  onClose: () => void;
  onRequestRetry: (delivery: {
    id: string;
    channel: RentalDeliveryChannel;
    destination: string;
  }) => void;
};

const CHANNEL_ICON: Record<
  RentalDeliveryChannel,
  "mail" | "whatsapp" | "document"
> = {
  EMAIL: "mail",
  WHATSAPP: "whatsapp",
  SMS: "document",
};

function formatSendTime(minutes: number) {
  return `${Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
}

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 border-t border-border pt-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {children}
    </section>
  );
}

function formatPolicy(policy: RentalDispatchPolicySnapshot | null) {
  if (!policy) return "Política no disponible.";
  const parts: string[] = [];
  if (policy.preDueEnabled) {
    parts.push(
      `Previo: ${policy.preDueDays} ${policy.preDueDays === 1 ? "día" : "días"} antes`,
    );
  }
  if (policy.dueEnabled) parts.push("Due: día del vencimiento");
  if (policy.postDueEnabled) {
    parts.push(
      `Post-due: ${policy.postDueDays} ${policy.postDueDays === 1 ? "día" : "días"} después`,
    );
  }
  parts.push(`Hora: ${formatSendTime(policy.sendTimeMinutes)}`);
  parts.push(`Zona horaria: ${policy.timeZone ?? "—"}`);
  return parts.join(" · ");
}

function SentMessageCard({
  delivery,
  canManage,
  onRequestRetry,
}: {
  delivery: RentalDispatchHistoryDelivery;
  canManage: boolean;
  onRequestRetry: Props["onRequestRetry"];
}) {
  const content = delivery.content;
  return (
    <details className="group rounded-lg border border-border bg-surface">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 font-medium">
            <SystemIcon
              name={CHANNEL_ICON[delivery.channel]}
              className="size-4 shrink-0 text-muted"
            />
            {COMMUNICATION_CHANNEL_LABELS[delivery.channel]}
            <Badge variant={DELIVERY_STATUS_BADGE_VARIANT[delivery.status]}>
              {COMMUNICATION_DELIVERY_STATUS_LABELS[delivery.status]}
            </Badge>
          </div>
          {delivery.channel === "EMAIL" && content.subject ? (
            <p className="mt-2 font-medium">{content.subject}</p>
          ) : null}
          {content.body ? (
            <p className="mt-2 whitespace-pre-wrap break-words text-sm text-muted">
              {content.body}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Contenido no disponible en el snapshot.
            </p>
          )}
          {content.templateKey && !content.body ? (
            <p className="mt-1 text-xs text-muted">
              Plantilla congelada disponible: {content.templateKey}
            </p>
          ) : null}
          <p className="mt-2 text-xs text-muted">
            Enviado: {delivery.sentAt ? formatDateTime(delivery.sentAt) : "—"}
          </p>
        </div>
        <SystemIcon
          name="sortDesc"
          className="mt-1 size-4 shrink-0 text-muted transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="border-t border-border px-3 pb-3 pt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Detalle del envío
        </p>
        <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted">
          <DetailRow label="Destino">{delivery.destination}</DetailRow>
          <DetailRow label="Enviado">
            {delivery.sentAt ? formatDateTime(delivery.sentAt) : "—"}
          </DetailRow>
          <DetailRow label="Entregado">
            {delivery.deliveredAt ? formatDateTime(delivery.deliveredAt) : "—"}
          </DetailRow>
          <DetailRow label="Leído">
            {delivery.readAt ? formatDateTime(delivery.readAt) : "—"}
          </DetailRow>
          <DetailRow label="Fallido">
            {delivery.failedAt ? formatDateTime(delivery.failedAt) : "—"}
          </DetailRow>
          <DetailRow label="Saltado">
            {delivery.skippedAt ? formatDateTime(delivery.skippedAt) : "—"}
          </DetailRow>
          <DetailRow label="Intentos">{delivery.attemptCount}</DetailRow>
        </dl>
        {delivery.error?.message ? (
          <p className="mt-3 rounded-md bg-red-50 p-2 text-xs text-red-700">
            {delivery.error.message}
          </p>
        ) : null}
        {delivery.status === "FAILED" && delivery.retryEligible && canManage ? (
          <Button
            className="mt-3"
            size="sm"
            variant="outline-secondary"
            onClick={(event) => {
              event.preventDefault();
              onRequestRetry({
                id: delivery.id,
                channel: delivery.channel,
                destination: delivery.destination,
              });
            }}
          >
            Reintentar
          </Button>
        ) : null}
      </div>
    </details>
  );
}

function ResponseCard({
  response,
  canManage,
  pending,
  onAction,
}: {
  response: RentalDispatchResponse;
  canManage: boolean;
  pending: string | null;
  onAction: (id: string, action: "read" | "acknowledge") => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-alt p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium">
            {response.contact?.name ?? "Contacto no identificado"}
          </p>
          <p className="text-xs text-muted">
            {formatDateTime(response.receivedAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          <Badge variant={response.readAt ? "neutral" : "info"}>
            {response.readAt ? "Leído" : "No leído"}
          </Badge>
          <Badge variant={response.acknowledgedAt ? "success" : "warning"}>
            {response.acknowledgedAt ? "Atendido" : "Pendiente"}
          </Badge>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap break-words text-sm">
        {response.body || "Mensaje vacío"}
      </p>
      {response.acknowledgedBy ? (
        <p className="mt-2 text-xs text-muted">
          Atendido por {response.acknowledgedBy.name}
        </p>
      ) : null}
      {canManage && (!response.readAt || !response.acknowledgedAt) ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {!response.readAt ? (
            <Button
              size="sm"
              variant="outline-primary"
              loading={pending === `${response.id}:read`}
              disabled={pending !== null}
              onClick={() => onAction(response.id, "read")}
            >
              Marcar como leído
            </Button>
          ) : null}
          {!response.acknowledgedAt ? (
            <Button
              size="sm"
              variant="primary"
              loading={pending === `${response.id}:acknowledge`}
              disabled={pending !== null}
              onClick={() => onAction(response.id, "acknowledge")}
            >
              Marcar como atendido
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CommunicationsHistoryPanel({
  item,
  canManage,
  scope = "global",
  onClose,
  onRequestRetry,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [responses, setResponses] = useState(
    item.deliveries.flatMap((delivery) => delivery.responses),
  );
  const [pending, setPending] = useState<string | null>(null);
  const statusSummary = buildDispatchStatusSummary(item.deliveries);

  useEffect(() => {
    setResponses(item.deliveries.flatMap((delivery) => delivery.responses));
  }, [item]);

  const whatsappLinks = useMemo(
    () => [
      ...new Set(
        responses.map((response) => response.externalReplyLink).filter(Boolean),
      ),
    ],
    [responses],
  );

  async function updateResponse(id: string, action: "read" | "acknowledge") {
    setPending(`${id}:${action}`);
    const result =
      action === "read"
        ? await markInboundReadAction(id)
        : await acknowledgeInboundAction(id);
    setPending(null);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setResponses((current) =>
      current.map((response) =>
        response.id === id
          ? {
              ...response,
              readAt: result.value.readAt,
              acknowledgedAt: result.value.acknowledgedAt,
              acknowledgedBy: result.value.acknowledgedBy,
            }
          : response,
      ),
    );
    toast.success(
      action === "read"
        ? "Mensaje marcado como leído."
        : "Mensaje marcado como atendido.",
    );
    // Mantiene abierto el panel y sincroniza la lista sin marcar al abrir.
    router.refresh();
  }

  return (
    <SidePanel open onClose={onClose} width="lg">
      <SidePanelHeader>
        <SidePanelTitle>
          Aviso para {item.contract.internalNumber}
        </SidePanelTitle>
        <SidePanelDescription>
          {REMINDER_EVENT_LABELS[item.eventType]} · programado el{" "}
          {formatDateTime(item.scheduledFor)}
        </SidePanelDescription>
      </SidePanelHeader>
      <SidePanelContent>
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={DISPATCH_STATUS_BADGE_VARIANT[item.status]}>
              Estado global: {DISPATCH_STATUS_LABELS[item.status]}
            </Badge>
            <Badge variant={statusSummary.variant}>{statusSummary.label}</Badge>
          </div>

          <dl className="space-y-4">
            {scope === "global" ? (
              <DetailRow label="Contrato">
                <Link
                  href={`/alquileres/${item.contract.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {item.contract.internalNumber}
                </Link>
              </DetailRow>
            ) : null}
            <DetailRow label="Destinatarios">
              {item.recipients
                .map((recipient) => recipient.name ?? "Contacto sin nombre")
                .join(", ") || "Sin destinatarios registrados"}
            </DetailRow>
            <DetailRow label="Conceptos">
              {item.conceptDetails.length > 0 ? (
                <ul className="space-y-1">
                  {item.conceptDetails.map((concept, index) => (
                    <li key={concept.conceptId ?? concept.conceptName ?? index}>
                      <span className="font-medium">
                        {concept.conceptName ?? "Concepto sin nombre"}
                      </span>
                      {concept.dueDate ? (
                        <span className="text-muted">
                          {" "}
                          · vence {formatDateOnly(concept.dueDate)}
                        </span>
                      ) : null}
                      {concept.showAmount && concept.amount ? (
                        <span className="text-muted">
                          {" "}
                          · {concept.currency ?? ""} {concept.amount}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                "Sin conceptos en el aviso"
              )}
            </DetailRow>
          </dl>

          <Section title="Mensaje enviado">
            <div className="space-y-3">
              {item.deliveries.map((delivery) => (
                <SentMessageCard
                  key={delivery.id}
                  delivery={delivery}
                  canManage={canManage}
                  onRequestRetry={onRequestRetry}
                />
              ))}
            </div>
          </Section>

          <Section title={`Respuestas recibidas (${responses.length})`}>
            {responses.length > 0 ? (
              <div className="space-y-3">
                {responses.map((response) => (
                  <ResponseCard
                    key={response.id}
                    response={response}
                    canManage={canManage}
                    pending={pending}
                    onAction={updateResponse}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                No hay respuestas correlacionadas con este aviso.
              </p>
            )}
            {whatsappLinks.length === 1 ? (
              <div className="space-y-1.5">
                <a
                  href={whatsappLinks[0]!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-primary hover:underline"
                >
                  Responder por WhatsApp ↗
                </a>
                <p className="text-xs text-muted">
                  Se abrirá WhatsApp externamente. Valorar no registra la
                  conversación posterior.
                </p>
              </div>
            ) : whatsappLinks.length > 1 ? (
              <p className="text-xs text-muted">
                Hay múltiples destinos de WhatsApp; selecciona una respuesta
                concreta desde Respuestas recibidas.
              </p>
            ) : null}
          </Section>

          <Section title="Configuración del aviso">
            <p className="text-sm text-muted">{formatPolicy(item.policy)}</p>
          </Section>
        </div>
      </SidePanelContent>
      <SidePanelFooter>
        <Button variant="secondary" onClick={onClose}>
          Cerrar
        </Button>
      </SidePanelFooter>
    </SidePanel>
  );
}
