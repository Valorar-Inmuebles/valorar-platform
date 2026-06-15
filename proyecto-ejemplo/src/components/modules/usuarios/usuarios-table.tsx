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
import { setUsuarioActivo, UsuarioApiError } from "@/lib/api/usuarios";
import { formatDisplayDateTime, parseTimestamptz, type TimestamptzInput } from "@/lib/datetime/format-display-datetime";
import type { UsuarioListItem } from "@/lib/server/services/usuario.service";

const BASE_PATH = "/configuracion/usuarios";

type SortKey = "nombre_completo" | "email" | "tenant_nombre" | "roles" | "ultimo_login_at";

function formatRoles(roles: string[]): string {
  return roles.length > 0 ? roles.join(", ") : "—";
}

function formatUltimoLogin(value: TimestamptzInput): string {
  if (value == null) return "—";
  return formatDisplayDateTime(value) || "—";
}

function compareUltimoLogin(
  a: TimestamptzInput,
  b: TimestamptzInput,
  dir: SortDirection,
): number {
  const ta = parseTimestamptz(a)?.getTime();
  const tb = parseTimestamptz(b)?.getTime();

  if (ta == null && tb == null) return 0;
  if (ta == null) return 1;
  if (tb == null) return -1;
  if (ta < tb) return dir === "asc" ? -1 : 1;
  if (ta > tb) return dir === "asc" ? 1 : -1;
  return 0;
}

type Props = {
  usuarios: UsuarioListItem[];
  showTenantColumn?: boolean;
};

export function UsuariosTable({ usuarios, showTenantColumn = false }: Props) {
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre_completo");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pendingActivoChange, setPendingActivoChange] = useState<{
    id: string;
    nombre: string;
    activo: boolean;
  } | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return usuarios;
    const q = query.toLowerCase();
    return usuarios.filter(
      (u) =>
        u.nombre_completo.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.tenant_nombre?.toLowerCase().includes(q) ?? false) ||
        formatRoles(u.roles).toLowerCase().includes(q),
    );
  }, [usuarios, query]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (sortKey === "ultimo_login_at") {
        return compareUltimoLogin(a.ultimo_login_at, b.ultimo_login_at, sortDir);
      }

      const av =
        sortKey === "roles"
          ? formatRoles(a.roles).toLowerCase()
          : sortKey === "tenant_nombre"
            ? (a.tenant_nombre ?? "").toLowerCase()
            : (a[sortKey] ?? "").toLowerCase();
      const bv =
        sortKey === "roles"
          ? formatRoles(b.roles).toLowerCase()
          : sortKey === "tenant_nombre"
            ? (b.tenant_nombre ?? "").toLowerCase()
            : (b[sortKey] ?? "").toLowerCase();

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
      setSortDir(key === "ultimo_login_at" ? "desc" : "asc");
    }
    setPage(1);
  }

  function handleSearch(q: string) {
    setQuery(q);
    setPage(1);
  }

  function handleConfirmActivoChange() {
    if (!pendingActivoChange) return;

    const { id, activo } = pendingActivoChange;

    startTransition(async () => {
      try {
        await setUsuarioActivo(id, activo);
        toast.success(activo ? "Usuario habilitado" : "Usuario deshabilitado");
        setPendingActivoChange(null);
        router.refresh();
      } catch (err: unknown) {
        const message =
          err instanceof UsuarioApiError || err instanceof Error
            ? err.message
            : activo
              ? "Error al habilitar usuario"
              : "Error al deshabilitar usuario";
        toast.error(message);
      }
    });
  }

  const isEnableConfirm = pendingActivoChange?.activo === true;

  const totalCols = showTenantColumn ? 7 : 6;

  return (
    <>
      <ConfirmModal
        open={pendingActivoChange !== null}
        onClose={() => setPendingActivoChange(null)}
        onConfirm={handleConfirmActivoChange}
        loading={isPending}
        title={isEnableConfirm ? "Habilitar usuario" : "Deshabilitar usuario"}
        description={
          pendingActivoChange
            ? isEnableConfirm
              ? `¿Habilitar a "${pendingActivoChange.nombre}"? Podrá iniciar sesión nuevamente.`
              : `¿Deshabilitar a "${pendingActivoChange.nombre}"? No podrá iniciar sesión.`
            : undefined
        }
        confirmLabel={isEnableConfirm ? "Habilitar" : "Deshabilitar"}
        cancelLabel="Cancelar"
      />

      <TableSurface>
        <TableToolbar>
          <TableSearch
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={
              showTenantColumn
                ? "Buscar por nombre, email, tenant o rol…"
                : "Buscar por nombre, email o rol…"
            }
            aria-label="Buscar usuarios"
            className="w-56"
          />
          <div className="ml-auto" />
          <Link href={`${BASE_PATH}/crear`}>
            <Button>Nuevo usuario</Button>
          </Link>
        </TableToolbar>

        <Table noBorder>
          <TableHeader>
            <TableRow>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "nombre_completo" ? sortDir : null}
                onSort={() => handleSort("nombre_completo")}
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
              {showTenantColumn && (
                <TableCell
                  isHeader
                  sortable
                  sortDirection={sortKey === "tenant_nombre" ? sortDir : null}
                  onSort={() => handleSort("tenant_nombre")}
                >
                  Tenant
                </TableCell>
              )}
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "roles" ? sortDir : null}
                onSort={() => handleSort("roles")}
              >
                Roles
              </TableCell>
              <TableCell
                isHeader
                sortable
                sortDirection={sortKey === "ultimo_login_at" ? sortDir : null}
                onSort={() => handleSort("ultimo_login_at")}
              >
                Último login
              </TableCell>
              <TableCell isHeader>Estado</TableCell>
              <TableCell
                isHeader
                sticky
                className="w-px whitespace-nowrap pr-3 text-right"
              >
                Acciones
              </TableCell>
            </TableRow>
          </TableHeader>

          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className="px-4 py-10 text-center text-sm text-zinc-400"
                >
                  {query
                    ? `Sin resultados para "${query}"`
                    : "No hay usuarios registrados"}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span className="font-medium text-zinc-900">
                      {row.nombre_completo}
                    </span>
                  </TableCell>
                  <TableCell className="text-zinc-500">{row.email}</TableCell>
                  {showTenantColumn && (
                    <TableCell className="text-zinc-500">
                      {row.tenant_nombre ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-zinc-500">
                    {formatRoles(row.roles)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-zinc-500">
                    {formatUltimoLogin(row.ultimo_login_at)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        row.activo
                          ? "inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-800"
                          : "inline-flex rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-xs font-medium text-zinc-500"
                      }
                    >
                      {row.activo ? "Activo" : "Inactivo"}
                    </span>
                  </TableCell>
                  <TableCell sticky align="right" className="pr-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <Tooltip content="Editar">
                        <Link
                          href={`${BASE_PATH}/${row.id}`}
                          aria-label={`Editar ${row.nombre_completo}`}
                          className="flex size-6 items-center justify-center rounded text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                        >
                          <Icon.Edit className="size-3.5" />
                        </Link>
                      </Tooltip>
                      {row.activo ? (
                        <Tooltip content="Deshabilitar">
                          <ActionIconButton
                            type="button"
                            variant="destructive"
                            aria-label={`Deshabilitar ${row.nombre_completo}`}
                            onClick={() =>
                              setPendingActivoChange({
                                id: row.id,
                                nombre: row.nombre_completo,
                                activo: false,
                              })
                            }
                          >
                            <Icon.Ban className="size-3.5" />
                          </ActionIconButton>
                        </Tooltip>
                      ) : (
                        <Tooltip content="Habilitar">
                          <ActionIconButton
                            type="button"
                            aria-label={`Habilitar ${row.nombre_completo}`}
                            onClick={() =>
                              setPendingActivoChange({
                                id: row.id,
                                nombre: row.nombre_completo,
                                activo: true,
                              })
                            }
                          >
                            <Icon.CheckDone className="size-3.5" />
                          </ActionIconButton>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </tbody>
        </Table>

        {total > 0 && (
          <TableFooter
            page={page}
            pageSize={pageSize}
            total={total}
            pageSizeOptions={[5, 10, 25]}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </TableSurface>
    </>
  );
}
