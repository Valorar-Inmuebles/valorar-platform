import type { ReactNode } from "react";
import { TableCell } from "@/components/ui/table";
import {
  TableReorderControls,
  type TableReorderControlsProps,
} from "@/components/ui/table-reorder-controls";

/** Col 1 — reorden (sin título en header). */
export const TABLE_REORDER_HEADER_CLASS = "w-10 px-1";

export const TABLE_REORDER_CELL_CLASS = "w-10 px-1 align-middle";

/** Col 2 — identidad de etapa (solo Paso 3 Etapas). */
export const TABLE_ETAPA_HEADER_CLASS = "w-12 px-2";

export const TABLE_ETAPA_CELL_CLASS = "w-12 px-2 align-middle";

type TableReorderColumnCellProps = {
  readonly?: boolean;
  controls?: TableReorderControlsProps;
  className?: string;
};

/** Col 1 — solo controles ↑↓; vacío en readonly. */
export function TableReorderColumnCell({
  readonly = false,
  controls,
  className = "",
}: TableReorderColumnCellProps) {
  return (
    <TableCell
      align="center"
      className={`${TABLE_REORDER_CELL_CLASS} ${className}`.trim()}
    >
      {!readonly && controls ? <TableReorderControls {...controls} /> : null}
    </TableCell>
  );
}

type TableEtapaColumnCellProps = {
  badge: ReactNode;
  className?: string;
};

/** Col 2 — badge de etapa (identidad visual del flujo; solo Etapas). */
export function TableEtapaColumnCell({
  badge,
  className = "",
}: TableEtapaColumnCellProps) {
  return (
    <TableCell
      align="center"
      className={`${TABLE_ETAPA_CELL_CLASS} ${className}`.trim()}
    >
      {badge}
    </TableCell>
  );
}
