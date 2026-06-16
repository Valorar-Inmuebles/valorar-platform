"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
  TableSearch,
  TableSurface,
  TableToolbar,
  TableFooter,
  type SortDirection,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ConfirmModal } from "@/components/ui/modal";
import { Tooltip } from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import { deleteTenant } from "@/lib/api/tenant.api";
import type { TenantListItem } from "@/lib/server/services/tenant.service";

const DEFAULT_BASE_PATH = "/configuracion/tenants";

type SortKey = "nombre" | "email" | "telefono";

type Props = {
  tenants: TenantListItem[];
  basePath?: string;
};

export function TenantsTable({
  tenants,
  basePath = DEFAULT_BASE_PATH,
}: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const pendingTenant = pendingId
    ? tenants.find((tenant) => tenant.id === pendingId)
    : null;

  const filtered = useMemo(() => {
    if (!query.trim()) return tenants;
    const q = query.toLowerCase();
    return tenants.filter(
      (tenant) =>
        tenant.nombre.toLowerCase().includes(q) ||
        (tenant.email?.toLowerCase().includes(q) ?? false) ||
        (tenant.telefono?.toLowerCase().includes(q) ?? false),
    );
  }, [tenants, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av =
        sortKey === "email"
          ? (a.email ?? "").toLowerCase()
          : sortKey === "telefono"
            ? (a.telefono ?? "").toLowerCase()
            : a.nombre.toLowerCase();
      const bv =
        sortKey === "email"
          ? (b.email ?? "").toLowerCase()
          : sortKey === "telefono"
            ? (b.telefono ?? "").toLowerCase()
            : b.nombre.toLowerCase();

      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const pageStart = (page - 1) * pageSize;
  const paginated = sorted.slice(pageStart, pageStart + pageSize);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  function handleSearch(q: string) {
    setQuery(q);
    setPage(1);
  }

  function handleConfirm() {
    if (!pendingId) return;

    startTransition(async () => {
      try {
        await deleteTenant(pendingId);
        toast.success("Tenant eliminado");
        setPendingId(null);
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Error al eliminar";
        toast.error(message);
      }
    });
  }

  return (
    <>
      <ConfirmModal
        open={pendingId !== null}
        onClose={() => setPendingId(null)}
        onConfirm={handleConfirm}
        loading={isPending}
        title="Eliminar tenant"
        description={
          pendingTenant
            ? `¿Eliminar "${pendingTenant.nombre}"? Esta acción no se puede deshacer.`
            : "¿Estás seguro que querés eliminar este tenant?"
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
      />

      <TableSurface>
        <TableToolbar>
          <TableSearch
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, email o teléfono…"
            aria-label="Buscar tenants"
            className="w-56"
          />
          <div className="ml-auto" />
          <Link href={`${basePath}/crear`}>
            <Button>Nuevo tenant</Button>
          </Link>
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "nombre" ? sortDir : null}
                onSort={() => handleSort("nombre")}
              >
                Nombre
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "email" ? sortDir : null}
                onSort={() => handleSort("email")}
              >
                Email
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "telefono" ? sortDir : null}
                onSort={() => handleSort("telefono")}
              >
                Teléfono
              </TableCell>
              <TableCell isHeader align="right">
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>
          <tbody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-zinc-400">
                  {query.trim() ? "Sin resultados" : "No hay tenants"}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>{tenant.nombre}</TableCell>
                  <TableCell>{tenant.email ?? "—"}</TableCell>
                  <TableCell>{tenant.telefono ?? "—"}</TableCell>
                  <TableCell align="right">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip content="Editar">
                        <Link
                          href={`${basePath}/${tenant.id}`}
                          aria-label={`Editar ${tenant.nombre}`}
                          className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <Icon.Edit className="size-3.5" />
                        </Link>
                      </Tooltip>

                      <Tooltip content="Eliminar">
                        <ActionIconButton
                          type="button"
                          variant="destructive"
                          aria-label={`Eliminar ${tenant.nombre}`}
                          onClick={() => setPendingId(tenant.id)}
                        >
                          <Icon.Trash className="size-3.5" />
                        </ActionIconButton>
                      </Tooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        {total > 0 && (
          <TableFooter
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
          />
        )}
      </TableSurface>
    </>
  );
}
