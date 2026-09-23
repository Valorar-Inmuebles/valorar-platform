import { describe, expect, it } from "vitest";
import {
  buildCommunicationsAttentionRows,
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DELIVERY_STATUS_LABELS,
  COMMUNICATIONS_SUMMARY_METRICS,
  DELIVERY_STATUS_BADGE_VARIANT,
  inclusiveDayToExclusiveIso,
  maskChannelDestination,
  retryDeliveryFeedback,
} from "./rental-communications";
import type {
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalInboundMessage,
} from "@repo/shared-types";

const delivery: RentalAttentionDeliveryItem = {
  id: "delivery-1",
  dispatchId: "dispatch-1",
  channel: "WHATSAPP",
  status: "FAILED",
  destinationSnapshot: "+5491122334455",
  failedAt: "2026-09-22T10:00:00.000Z",
  attemptCount: 2,
};

const issue: RentalAttentionPlanningIssueItem = {
  id: "issue-1",
  contractId: "contract-9",
  occurrenceId: null,
  channel: "EMAIL",
  type: "DUE_DATE_MISSING",
  status: "OPEN",
  lastDetectedAt: "2026-09-21T08:00:00.000Z",
};

const message: RentalInboundMessage = {
  id: "msg-1",
  receivedAt: "2026-09-22T12:30:00.000Z",
  messageType: "TEXT",
  body: "Hola, quisiera más información",
  sender: { address: "+5491122334455" },
  readAt: null,
  acknowledgedAt: null,
  acknowledgedBy: null,
  contact: { id: "contact-1", name: "Juan Pérez" },
  contract: { id: "contract-3", internalNumber: "C-003" },
  deliveryCorrelated: false,
  externalReplyLink: "https://wa.me/5491122334455",
};

describe("COMMUNICATION_DELIVERY_STATUS_LABELS", () => {
  it("cubre los 7 estados con labels humanos en español", () => {
    expect(Object.keys(COMMUNICATION_DELIVERY_STATUS_LABELS)).toEqual([
      "PENDING",
      "PROCESSING",
      "SENT",
      "DELIVERED",
      "READ",
      "FAILED",
      "SKIPPED",
    ]);
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.PENDING).toBe("Pendiente");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.PROCESSING).toBe("En proceso");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.SENT).toBe("Enviado");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.DELIVERED).toBe("Entregado");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.READ).toBe("Leído");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.FAILED).toBe("Fallido");
    expect(COMMUNICATION_DELIVERY_STATUS_LABELS.SKIPPED).toBe("Omitido");
  });
});

describe("DELIVERY_STATUS_BADGE_VARIANT", () => {
  it("aplica el mapping aprobado (systema neutral + semántica)", () => {
    expect(DELIVERY_STATUS_BADGE_VARIANT.PENDING).toBe("neutral");
    expect(DELIVERY_STATUS_BADGE_VARIANT.PROCESSING).toBe("info");
    expect(DELIVERY_STATUS_BADGE_VARIANT.SENT).toBe("neutral");
    expect(DELIVERY_STATUS_BADGE_VARIANT.DELIVERED).toBe("success");
    expect(DELIVERY_STATUS_BADGE_VARIANT.READ).toBe("success");
    expect(DELIVERY_STATUS_BADGE_VARIANT.FAILED).toBe("danger");
    expect(DELIVERY_STATUS_BADGE_VARIANT.SKIPPED).toBe("neutral");
  });
});

describe("COMMUNICATIONS_SUMMARY_METRICS", () => {
  it("expone los 6 contadores en orden canónico con label de producto", () => {
    expect(COMMUNICATIONS_SUMMARY_METRICS.map((m) => m.key)).toEqual([
      "dispatchesScheduledToday",
      "deliveriesSentToday",
      "deliveriesDeliveredToday",
      "deliveriesFailedToday",
      "planningIssuesOpen",
      "inboundUnacknowledged",
    ]);
    expect(COMMUNICATIONS_SUMMARY_METRICS.map((m) => m.label)).toEqual([
      "Programados hoy",
      "Enviados hoy",
      "Entregados hoy",
      "Fallidos hoy",
      "Inconvenientes de planificación",
      "Mensajes sin atender",
    ]);
  });
});

describe("maskChannelDestination", () => {
  it("enmascara teléfonos conservando prefijo y sufijo", () => {
    expect(maskChannelDestination("WHATSAPP", "+5491122334455")).toBe(
      "+54*******4455",
    );
  });

  it("enmascara emails conservando dominio", () => {
    expect(maskChannelDestination("EMAIL", "juan.perez@correo.com")).toBe(
      "j***@correo.com",
    );
  });

  it("enmascara valores cortos por completo", () => {
    expect(maskChannelDestination("WHATSAPP", "5566")).toBe("****");
  });
});

describe("buildCommunicationsAttentionRows", () => {
  it("unifica las entidades distintas conservando su Tipo", () => {
    const rows = buildCommunicationsAttentionRows({
      deliveries: [delivery],
      planningIssues: [issue],
      inbound: [message],
    });

    expect(rows).toHaveLength(3);
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    expect(byKind.delivery?.kindLabel).toBe("Envío fallido");
    expect(byKind.delivery?.kindBadge).toBe("danger");
    expect(byKind.delivery?.detail).toBe(
      `${COMMUNICATION_CHANNEL_LABELS.WHATSAPP} a ${maskChannelDestination(
        "WHATSAPP",
        delivery.destinationSnapshot,
      )}`,
    );
    expect(byKind.delivery?.deliveryId).toBe("delivery-1");

    expect(byKind.planning?.kindLabel).toBe("Inconveniente de planificación");
    expect(byKind.planning?.contractHref).toBe("/alquileres/contract-9");
    expect(byKind.planning?.detail).toBe("Falta fecha de vencimiento");

    expect(byKind.inbound?.kindLabel).toBe("Mensaje sin atender");
    expect(byKind.inbound?.contractHref).toBe("/alquileres/contract-3");
    expect(byKind.inbound?.message?.id).toBe("msg-1");
  });

  it("no inventa contrato cuando no está disponible", () => {
    const rows = buildCommunicationsAttentionRows({
      deliveries: [delivery],
      planningIssues: [{ ...issue, contractId: null }],
      inbound: [{ ...message, contract: null }],
    });
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    expect(byKind.delivery?.contractHref).toBeNull();
    expect(byKind.planning?.contractHref).toBeNull();
    expect(byKind.inbound?.contractHref).toBeNull();
  });

  it("ordena las filas por ocurrencia descendente", () => {
    const rows = buildCommunicationsAttentionRows({
      deliveries: [delivery],
      planningIssues: [issue],
      inbound: [message],
    });
    expect(rows.map((r) => r.occurredAt)).toEqual([
      "2026-09-22T12:30:00.000Z",
      "2026-09-22T10:00:00.000Z",
      "2026-09-21T08:00:00.000Z",
    ]);
  });

  it("devuelve lista vacía sin entradas", () => {
    expect(
      buildCommunicationsAttentionRows({
        deliveries: [],
        planningIssues: [],
        inbound: [],
      }),
    ).toEqual([]);
  });
});

describe("inclusiveDayToExclusiveIso", () => {
  it("convierte un día inclusive al inicio del día siguiente (UTC)", () => {
    expect(inclusiveDayToExclusiveIso("2026-09-22")).toBe(
      "2026-09-23T00:00:00.000Z",
    );
  });

  it("devuelve vacío para valores inválidos", () => {
    expect(inclusiveDayToExclusiveIso("22/09/2026")).toBe("");
    expect(inclusiveDayToExclusiveIso("")).toBe("");
  });
});

describe("retryDeliveryFeedback", () => {
  it("cubre los 5 reasons canónicos con variante y mensaje", () => {
    expect(retryDeliveryFeedback("NOT_FOUND").variant).toBe("error");
    expect(retryDeliveryFeedback("NOT_FAILED").variant).toBe("info");
    expect(retryDeliveryFeedback("IN_FLIGHT").variant).toBe("warning");
    expect(retryDeliveryFeedback("MAX_ATTEMPTS").variant).toBe("error");
    expect(retryDeliveryFeedback("CONCURRENT").variant).toBe("warning");
    for (const reason of [
      "NOT_FOUND",
      "NOT_FAILED",
      "IN_FLIGHT",
      "MAX_ATTEMPTS",
      "CONCURRENT",
    ] as const) {
      expect(retryDeliveryFeedback(reason).message.length).toBeGreaterThan(0);
    }
  });
});
