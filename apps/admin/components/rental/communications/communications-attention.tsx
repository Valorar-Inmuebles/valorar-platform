"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  AdminTable,
  AdminTableActions,
  AdminTableBody,
  AdminTableCell,
  AdminTableHead,
  AdminTableHeader,
  AdminTableRow,
  AdminTableState,
} from "@repo/ui/admin-table";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import { ConfirmModal } from "@repo/ui/modal";
import { useToast } from "@repo/ui/toast";
import { retryDeliveryAction } from "@/lib/api/rental-communications-actions";
import {
  retryDeliveryFeedback,
  type CommunicationsAttentionRow,
} from "@/lib/rental/rental-communications";
import { formatDateTime } from "@/lib/rental/rental-ui";

type Props = {
  rows: CommunicationsAttentionRow[];
  canManage: boolean;
};

const RETRY_COPY =
  "Se reprogramará este envío para el próximo ciclo. No se envía en este momento: no es un envío instantáneo. El historial de intentos se conserva.";

/**
 * Cola de excepciones técnicas: envíos fallidos e inconvenientes de
 * planificación. Los mensajes sin atender viven exclusivamente en Respuestas
 * recibidas.
 */
export function CommunicationsAttention({ rows, canManage }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [retryRow, setRetryRow] = useState<CommunicationsAttentionRow | null>(
    null,
  );
  const [retrying, setRetrying] = useState(false);

  async function confirmRetry() {
    if (!retryRow?.deliveryId) return;
    setRetrying(true);
    const result = await retryDeliveryAction(retryRow.deliveryId);
    setRetrying(false);
    setRetryRow(null);
    if (result.ok) {
      toast.success("Envío reprogramado para el próximo ciclo.");
    } else if (result.reason) {
      const feedback = retryDeliveryFeedback(result.reason);
      toast[feedback.variant](feedback.message);
    } else {
      toast.error(result.error);
    }
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Requieren atención</CardTitle>
          <span className="text-sm text-muted">
            {rows.length} {rows.length === 1 ? "ítem" : "ítems"}
          </span>
        </CardHeader>
        <CardContent flush>
          <AdminTable variant="integrated" className="min-w-[880px]">
            <AdminTableHead>
              <AdminTableRow>
                <AdminTableHeader>Tipo</AdminTableHeader>
                <AdminTableHeader>Detalle</AdminTableHeader>
                <AdminTableHeader>Contrato</AdminTableHeader>
                <AdminTableHeader>Ocurrió</AdminTableHeader>
                <AdminTableHeader>Estado</AdminTableHeader>
                <AdminTableHeader className="text-right">
                  Acciones
                </AdminTableHeader>
              </AdminTableRow>
            </AdminTableHead>
            <AdminTableBody>
              {rows.length === 0 ? (
                <AdminTableState
                  colSpan={6}
                  state="empty"
                  title={
                    canManage
                      ? "Nada requiere atención"
                      : "Sin mensajes sin atender"
                  }
                  description={
                    canManage
                      ? "No hay envíos fallidos, inconvenientes de planificación ni mensajes sin atender."
                      : "No hay mensajes recibidos pendientes de atención."
                  }
                />
              ) : (
                rows.map((row) => (
                  <AdminTableRow key={row.id}>
                    <AdminTableCell>
                      <Badge variant={row.kindBadge}>{row.kindLabel}</Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <p
                        className="max-w-72 truncate font-medium"
                        title={row.detail}
                      >
                        {row.detail}
                      </p>
                      {row.secondary ? (
                        <p className="mt-0.5 max-w-72 truncate text-xs text-muted">
                          {row.secondary}
                        </p>
                      ) : null}
                    </AdminTableCell>
                    <AdminTableCell>
                      {row.contractHref ? (
                        <Link
                          href={row.contractHref}
                          className="font-medium text-primary hover:underline"
                        >
                          Ver contrato
                        </Link>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      {row.occurredAt ? (
                        formatDateTime(row.occurredAt)
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge variant={row.statusBadge}>{row.statusLabel}</Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminTableActions>
                        {row.kind === "delivery" && canManage ? (
                          <Button
                            size="sm"
                            variant="outline-secondary"
                            onClick={() => setRetryRow(row)}
                          >
                            Reintentar
                          </Button>
                        ) : null}
                      </AdminTableActions>
                    </AdminTableCell>
                  </AdminTableRow>
                ))
              )}
            </AdminTableBody>
          </AdminTable>
        </CardContent>
      </Card>

      <ConfirmModal
        open={retryRow !== null}
        onClose={() => setRetryRow(null)}
        onConfirm={confirmRetry}
        title="Reintentar envío"
        description={RETRY_COPY}
        confirmLabel="Reintentar envío"
        cancelLabel="Volver"
        loading={retrying}
      />
    </>
  );
}
