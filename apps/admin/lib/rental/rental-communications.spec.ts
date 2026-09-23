import { describe, expect, it } from "vitest";
import {
  buildCommunicationsAttentionRows,
  buildDispatchStatusSummary,
  buildHistoryQuickFilter,
  COMMUNICATION_CHANNEL_LABELS,
  COMMUNICATION_DELIVERY_STATUS_LABELS,
  COMMUNICATIONS_SUMMARY_METRICS,
  DELIVERY_STATUS_BADGE_VARIANT,
  DISPATCH_STATUS_BADGE_VARIANT,
  DISPATCH_STATUS_LABELS,
  formatConceptsLabel,
  formatRecipientsLabel,
  HISTORY_COLUMNS,
  historyColumnsFromStorage,
  inclusiveDayToExclusiveIso,
  maskChannelDestination,
  REMINDER_EVENT_LABELS,
  retryDeliveryFeedback,
  toExclusiveDayBound,
} from "./rental-communications";
import type {
  RentalAttentionDeliveryItem,
  RentalAttentionPlanningIssueItem,
  RentalCommunicationsSummary,
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
    });

    expect(rows).toHaveLength(2);
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

    expect(byKind.inbound).toBeUndefined();
  });

  it("no inventa contrato cuando no está disponible", () => {
    const rows = buildCommunicationsAttentionRows({
      deliveries: [delivery],
      planningIssues: [{ ...issue, contractId: null }],
    });
    const byKind = Object.fromEntries(rows.map((r) => [r.kind, r]));
    expect(byKind.delivery?.contractHref).toBeNull();
    expect(byKind.planning?.contractHref).toBeNull();
  });

  it("ordena las filas por ocurrencia descendente", () => {
    const rows = buildCommunicationsAttentionRows({
      deliveries: [delivery],
      planningIssues: [issue],
    });
    expect(rows.map((r) => r.occurredAt)).toEqual([
      "2026-09-22T10:00:00.000Z",
      "2026-09-21T08:00:00.000Z",
    ]);
  });

  it("devuelve lista vacía sin entradas", () => {
    expect(
      buildCommunicationsAttentionRows({
        deliveries: [],
        planningIssues: [],
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

describe("REMINDER_EVENT_LABELS", () => {
  it("cubre los 3 eventos de recordatorio con labels de producto", () => {
    expect(REMINDER_EVENT_LABELS).toEqual({
      PRE_DUE: "Recordatorio previo",
      DUE: "Vencimiento",
      POST_DUE: "Recordatorio vencido",
    });
  });
});

describe("DISPATCH_STATUS_LABELS", () => {
  it("cubre los 7 estados de dispatch con labels humanos", () => {
    expect(Object.keys(DISPATCH_STATUS_LABELS)).toEqual([
      "PLANNED",
      "READY",
      "PROCESSING",
      "COMPLETED",
      "PARTIALLY_COMPLETED",
      "FAILED",
      "SKIPPED",
    ]);
    expect(DISPATCH_STATUS_LABELS.FAILED).toBe("Fallido");
    expect(DISPATCH_STATUS_LABELS.PARTIALLY_COMPLETED).toBe(
      "Parcialmente completado",
    );
  });

  it("asigna variante de badge semántico por estado", () => {
    expect(DISPATCH_STATUS_BADGE_VARIANT.COMPLETED).toBe("success");
    expect(DISPATCH_STATUS_BADGE_VARIANT.PARTIALLY_COMPLETED).toBe("warning");
    expect(DISPATCH_STATUS_BADGE_VARIANT.FAILED).toBe("danger");
    expect(DISPATCH_STATUS_BADGE_VARIANT.SKIPPED).toBe("neutral");
  });
});

describe("buildDispatchStatusSummary", () => {
  it("agrega en multicanal: 1 entregado · 1 fallido", () => {
    const summary = buildDispatchStatusSummary([
      { status: "DELIVERED" },
      { status: "FAILED" },
    ]);
    expect(summary).toEqual({
      label: "1 entregado · 1 fallido",
      variant: "danger",
      mixed: true,
    });
  });

  it("pluraliza conteos > 1 y prioriza danger ante fallidos", () => {
    const summary = buildDispatchStatusSummary([
      { status: "DELIVERED" },
      { status: "DELIVERED" },
      { status: "FAILED" },
    ]);
    expect(summary.label).toBe("2 entregados · 1 fallido");
    expect(summary.variant).toBe("danger");
  });

  it("delega al label/badge único cuando todos comparten estado", () => {
    const summary = buildDispatchStatusSummary([
      { status: "READ" },
      { status: "READ" },
    ]);
    expect(summary).toEqual({
      label: "Leído",
      variant: "success",
      mixed: false,
    });
  });

  it("responde Sin envíos cuando no hay deliveries", () => {
    expect(buildDispatchStatusSummary([])).toEqual({
      label: "Sin envíos",
      variant: "neutral",
      mixed: false,
    });
  });
});

describe("formatConceptsLabel / formatRecipientsLabel", () => {
  it("comprime conceptos: nombre único o primer nombre + varios", () => {
    expect(formatConceptsLabel([])).toBe("—");
    expect(formatConceptsLabel(["Alquiler"])).toBe("Alquiler");
    expect(formatConceptsLabel(["Alquiler", "Expensas"])).toBe(
      "Alquiler + varios",
    );
  });

  it("comprime destinatarios con +N más", () => {
    expect(formatRecipientsLabel([])).toBe("—");
    expect(formatRecipientsLabel([{ name: "Juan" }])).toBe("Juan");
    expect(
      formatRecipientsLabel([
        { name: "Juan" },
        { name: "Ana" },
        { name: null },
      ]),
    ).toBe("Juan +1 más");
  });
});

describe("toExclusiveDayBound", () => {
  it("convierte un día inclusive al ISO del día siguiente (Hasta)", () => {
    expect(toExclusiveDayBound("2026-09-22")).toBe("2026-09-23T00:00:00.000Z");
  });

  it("reenvía un ISO ya exclusivo sin conversión", () => {
    expect(toExclusiveDayBound("2026-09-23T03:00:00.000Z")).toBe(
      "2026-09-23T03:00:00.000Z",
    );
  });

  it("devuelve vacío para valores inválidos", () => {
    expect(toExclusiveDayBound("22/09/2026")).toBe("");
    expect(toExclusiveDayBound("")).toBe("");
  });
});

describe("buildHistoryQuickFilter", () => {
  const summary: RentalCommunicationsSummary = {
    asOf: "2026-09-22T12:00:00.000Z",
    timeZone: "America/Argentina/Buenos_Aires",
    window: {
      from: "2026-09-22T03:00:00.000Z",
      to: "2026-09-23T03:00:00.000Z",
    },
    dispatchesScheduledToday: 2,
    deliveriesSentToday: 3,
    deliveriesDeliveredToday: 2,
    deliveriesFailedToday: 1,
    planningIssuesOpen: 1,
    inboundUnacknowledged: 2,
  };

  it("las 4 métricas de ventana apuntan al Historial con la ventana real", () => {
    expect(buildHistoryQuickFilter(summary, "dispatchesScheduledToday")).toBe(
      "/alquileres/comunicaciones?tab=history&scheduledFrom=2026-09-22T03%3A00%3A00.000Z&scheduledTo=2026-09-23T03%3A00%3A00.000Z",
    );
    expect(buildHistoryQuickFilter(summary, "deliveriesSentToday")).toContain(
      "sentFrom=2026-09-22T03%3A00%3A00.000Z",
    );
    expect(
      buildHistoryQuickFilter(summary, "deliveriesDeliveredToday"),
    ).toContain("deliveredFrom=2026-09-22T03%3A00%3A00.000Z");
    expect(buildHistoryQuickFilter(summary, "deliveriesFailedToday")).toContain(
      "failedFrom=2026-09-22T03%3A00%3A00.000Z",
    );
  });

  it("los inconvenientes van a la cola de atención y lo sin atender a Respuestas", () => {
    expect(buildHistoryQuickFilter(summary, "planningIssuesOpen")).toBe(
      "/alquileres/comunicaciones?tab=attention",
    );
    expect(buildHistoryQuickFilter(summary, "inboundUnacknowledged")).toBe(
      "/alquileres/comunicaciones?tab=inbound&unacknowledged=true",
    );
  });
});

describe("HISTORY_COLUMNS", () => {
  it("mantiene Fecha/hora, Estado y Acciones como columnas obligatorias", () => {
    expect(
      HISTORY_COLUMNS.filter((column) => column.locked).map((c) => c.key),
    ).toEqual(["scheduledFor", "status", "actions"]);
  });

  it("expone la allowlist sortable con su sortBy (4 columnas)", () => {
    expect(
      HISTORY_COLUMNS.filter((column) => column.sortable).map(
        (c) => c.sortable,
      ),
    ).toEqual(["scheduledFor", "eventType", "internalNumber", "status"]);
  });
});

describe("historyColumnsFromStorage", () => {
  it("rechaza valores desconocidos y restaura el default sin data", () => {
    expect(
      historyColumnsFromStorage('["scheduledFor","not-a-column"]'),
    ).toEqual(["scheduledFor"]);
    expect(historyColumnsFromStorage(null)).toEqual(
      HISTORY_COLUMNS.map((column) => column.key),
    );
    expect(historyColumnsFromStorage("no-json")).toEqual(
      HISTORY_COLUMNS.map((column) => column.key),
    );
  });
});
