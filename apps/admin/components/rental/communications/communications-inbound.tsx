"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
import { DatePicker } from "@repo/ui/date-picker";
import { DropdownMenu } from "@repo/ui/dropdown-menu";
import { FilterBar, type ActiveFilter } from "@repo/ui/filter-bar";
import { Pagination } from "@repo/ui/pagination";
import { Select } from "@repo/ui/select";
import { useToast } from "@repo/ui/toast";
import {
  acknowledgeInboundAction,
  markInboundReadAction,
} from "@/lib/api/rental-communications-actions";
import { formatDateOnly, formatDateTime } from "@/lib/rental/rental-ui";
import type {
  PaginatedResponse,
  RentalInboundMessage,
} from "@repo/shared-types";

type Props = {
  result: PaginatedResponse<RentalInboundMessage>;
  canManage: boolean;
  onOpenInbound: (message: RentalInboundMessage) => void;
};

function openWhatsApp(link: string) {
  // Apertura externa con las mismas garantías que target=_blank +
  // rel="noopener noreferrer": ventana nueva sin handle de la página.
  window.open(link, "_blank", "noopener,noreferrer");
}

/**
 * Respuestas recibidas: listado server-side con paginación y filtros
 * (rango de recepción, lectura y atención) gobernados por la URL.
 */
export function CommunicationsInbound({
  result,
  canManage,
  onOpenInbound,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const rawUnread = searchParams.get("unread");
  const rawUnacknowledged = searchParams.get("unacknowledged");
  const rawReceivedFrom = searchParams.get("receivedFrom");
  const rawReceivedTo = searchParams.get("receivedTo");

  function buildUrl(
    overrides: Record<string, string | undefined>,
    resetPage = true,
  ) {
    const next = new URLSearchParams(searchParams.toString());
    next.set("tab", "inbound");
    if (resetPage) next.delete("page");
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined || value === "") next.delete(key);
      else next.set(key, value);
    }
    return `/alquileres/comunicaciones?${next.toString()}`;
  }

  const activeFilters: ActiveFilter[] = [];
  if (rawUnread === "true" || rawUnread === "false") {
    activeFilters.push({
      id: "unread",
      label: rawUnread === "true" ? "No leídos" : "Leídos",
      onRemove: () => router.push(buildUrl({ unread: "" })),
    });
  }
  if (rawUnacknowledged === "true" || rawUnacknowledged === "false") {
    activeFilters.push({
      id: "unacknowledged",
      label: rawUnacknowledged === "true" ? "Sin atender" : "Atendidas",
      onRemove: () => router.push(buildUrl({ unacknowledged: "" })),
    });
  }
  if (rawReceivedFrom) {
    activeFilters.push({
      id: "receivedFrom",
      label: `Recibidos desde el ${formatDateOnly(rawReceivedFrom)}`,
      onRemove: () => router.push(buildUrl({ receivedFrom: "" })),
    });
  }
  if (rawReceivedTo) {
    activeFilters.push({
      id: "receivedTo",
      label: `Recibidos hasta el ${formatDateOnly(rawReceivedTo)}`,
      onRemove: () => router.push(buildUrl({ receivedTo: "" })),
    });
  }

  async function markRead(message: RentalInboundMessage) {
    const result = await markInboundReadAction(message.id);
    if (!result.ok) return toast.error(result.error);
    toast.success("Mensaje marcado como leído.");
    router.refresh();
  }

  async function acknowledge(message: RentalInboundMessage) {
    const result = await acknowledgeInboundAction(message.id);
    if (!result.ok) return toast.error(result.error);
    toast.success("Mensaje marcado como atendido.");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Respuestas recibidas</CardTitle>
        <span className="text-sm text-muted">
          {result.total} {result.total === 1 ? "mensaje" : "mensajes"}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <FilterBar
          filters={
            <>
              <Select
                value={rawUnread ?? ""}
                placeholder="Lectura"
                options={[
                  { value: "", label: "Lectura: todas" },
                  { value: "true", label: "No leídos" },
                  { value: "false", label: "Leídos" },
                ]}
                onChange={(value) => router.push(buildUrl({ unread: value }))}
              />
              <Select
                value={rawUnacknowledged ?? ""}
                placeholder="Atención"
                options={[
                  { value: "", label: "Atención: todas" },
                  { value: "true", label: "Sin atender" },
                  { value: "false", label: "Atendidas" },
                ]}
                onChange={(value) =>
                  router.push(buildUrl({ unacknowledged: value }))
                }
              />
            </>
          }
          moreFilters={
            <div className="flex flex-wrap items-center gap-2">
              <DatePicker
                value={rawReceivedFrom ?? ""}
                placeholder="Recibidos desde"
                onChange={(value) =>
                  router.push(buildUrl({ receivedFrom: value }))
                }
              />
              <DatePicker
                value={rawReceivedTo ?? ""}
                placeholder="Recibidos hasta"
                onChange={(value) =>
                  router.push(buildUrl({ receivedTo: value }))
                }
              />
            </div>
          }
          activeFilters={activeFilters}
          onClearAll={() =>
            router.push(
              buildUrl({
                unread: "",
                unacknowledged: "",
                receivedFrom: "",
                receivedTo: "",
              }),
            )
          }
        />

        <AdminTable variant="integrated" className="min-w-[960px]">
          <AdminTableHead>
            <AdminTableRow>
              <AdminTableHeader>Contacto</AdminTableHeader>
              <AdminTableHeader>Contrato</AdminTableHeader>
              <AdminTableHeader>Mensaje</AdminTableHeader>
              <AdminTableHeader>Recibido</AdminTableHeader>
              <AdminTableHeader>Leído</AdminTableHeader>
              <AdminTableHeader>Atendido</AdminTableHeader>
              <AdminTableHeader className="text-right">
                Acciones
              </AdminTableHeader>
            </AdminTableRow>
          </AdminTableHead>
          <AdminTableBody>
            {result.items.length === 0 ? (
              <AdminTableState
                colSpan={7}
                state="empty"
                title={
                  activeFilters.length > 0
                    ? "Sin resultados"
                    : "Sin mensajes recibidos"
                }
                description="No hay respuestas recibidas que coincidan con los filtros seleccionados."
              />
            ) : (
              result.items.map((message) => {
                const contactName =
                  message.contact?.name ?? "Contacto no identificado";
                return (
                  <AdminTableRow key={message.id}>
                    <AdminTableCell>
                      <p className="max-w-40 truncate font-medium">
                        {contactName}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell>
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
                    </AdminTableCell>
                    <AdminTableCell>
                      <p
                        className="max-w-80 truncate text-muted"
                        title={message.body || "Mensaje vacío"}
                      >
                        {message.body || "Mensaje vacío"}
                      </p>
                    </AdminTableCell>
                    <AdminTableCell className="whitespace-nowrap">
                      {formatDateTime(message.receivedAt)}
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge variant={message.readAt ? "neutral" : "info"}>
                        {message.readAt ? "Leído" : "No leído"}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <Badge
                        variant={message.acknowledgedAt ? "success" : "warning"}
                      >
                        {message.acknowledgedAt ? "Atendido" : "Pendiente"}
                      </Badge>
                    </AdminTableCell>
                    <AdminTableCell>
                      <AdminTableActions>
                        <Button
                          size="sm"
                          variant="outline-primary"
                          onClick={() => onOpenInbound(message)}
                        >
                          Abrir
                        </Button>
                        {canManage ? (
                          <DropdownMenu
                            ariaLabel={`Acciones del mensaje de ${contactName}`}
                            trigger={
                              <span className="flex size-8 items-center justify-center rounded-md text-lg text-muted hover:bg-surface-alt">
                                ⋯
                              </span>
                            }
                            items={[
                              {
                                id: "read",
                                label: "Marcar como leído",
                                onSelect: () => markRead(message),
                              },
                              {
                                id: "acknowledge",
                                label: "Marcar como atendido",
                                onSelect: () => acknowledge(message),
                              },
                              ...(message.externalReplyLink
                                ? [
                                    {
                                      id: "whatsapp",
                                      label: "Responder por WhatsApp",
                                      onSelect: () =>
                                        openWhatsApp(
                                          message.externalReplyLink!,
                                        ),
                                    },
                                  ]
                                : []),
                            ]}
                          />
                        ) : null}
                      </AdminTableActions>
                    </AdminTableCell>
                  </AdminTableRow>
                );
              })
            )}
          </AdminTableBody>
        </AdminTable>

        {result.totalPages > 1 ? (
          <div className="rounded-xl border border-border bg-surface px-4 py-3">
            <Pagination
              page={result.page}
              pageSize={result.pageSize}
              total={result.total}
              totalPages={result.totalPages}
              onPageChange={(page) =>
                router.push(buildUrl({ page: String(page) }, false))
              }
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
