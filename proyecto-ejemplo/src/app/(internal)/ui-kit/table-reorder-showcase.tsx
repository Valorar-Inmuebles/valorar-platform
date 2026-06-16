"use client";

import { TableEtapaColumnCell, TableReorderColumnCell, TABLE_ETAPA_HEADER_CLASS, TABLE_REORDER_HEADER_CLASS } from "@/components/ui/table-order-cell";
import { WorkflowEtapaOrderBadge } from "@/components/modules/workflows/workflow-etapa-order-badge";
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
  TableSurface,
} from "@/components/ui/table";

type ReorderDemoRow = {
  id: string;
  label: string;
  position: number;
  canMoveUp: boolean;
  canMoveDown: boolean;
  disabled?: boolean;
  reordering?: boolean;
};

const ROWS: ReorderDemoRow[] = [
  {
    id: "enabled",
    label: "Enabled (middle row)",
    position: 1,
    canMoveUp: true,
    canMoveDown: true,
  },
  {
    id: "first",
    label: "First row",
    position: 2,
    canMoveUp: false,
    canMoveDown: true,
  },
  {
    id: "last",
    label: "Last row",
    position: 3,
    canMoveUp: true,
    canMoveDown: false,
  },
  {
    id: "disabled",
    label: "Disabled",
    position: 4,
    canMoveUp: true,
    canMoveDown: true,
    disabled: true,
  },
  {
    id: "reordering",
    label: "Reordering (busy)",
    position: 5,
    canMoveUp: true,
    canMoveDown: true,
    reordering: true,
  },
];

function ReorderControlsRow({
  row,
  showEtapaBadge = false,
}: {
  row: ReorderDemoRow;
  showEtapaBadge?: boolean;
}) {
  return (
    <TableRow className={row.reordering ? "opacity-60" : undefined}>
      <TableReorderColumnCell
        controls={{
          canMoveUp: row.canMoveUp,
          canMoveDown: row.canMoveDown,
          disabled: row.disabled,
          reordering: row.reordering,
          onMoveUp: () => undefined,
          onMoveDown: () => undefined,
          upLabel: `Subir ${row.label}`,
          downLabel: `Bajar ${row.label}`,
        }}
      />
      {showEtapaBadge ? (
        <TableEtapaColumnCell
          badge={
            <WorkflowEtapaOrderBadge position={row.position} color="primary" />
          }
        />
      ) : null}
      <TableCell className="text-sm text-zinc-700">{row.label}</TableCell>
    </TableRow>
  );
}

export function TableReorderControlsShowcase() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">
          Patrón default — solo reorden (Partes, Campos, Tareas, opciones)
        </p>
        <TableSurface>
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader>Estado</TableCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {ROWS.map((row) => (
                <ReorderControlsRow key={row.id} row={row} />
              ))}
            </tbody>
          </Table>
        </TableSurface>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-zinc-900">
          Patrón Etapas — reorden + badge de identidad
        </p>
        <TableSurface>
          <Table noBorder>
            <TableHeader>
              <TableRow>
                <TableCell
                  isHeader
                  className={TABLE_REORDER_HEADER_CLASS}
                  aria-label="Reordenar"
                />
                <TableCell isHeader align="center" className={TABLE_ETAPA_HEADER_CLASS}>
                  Etapas
                </TableCell>
                <TableCell isHeader>Estado</TableCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {ROWS.map((row) => (
                <ReorderControlsRow key={`etapa-${row.id}`} row={row} showEtapaBadge />
              ))}
            </tbody>
          </Table>
        </TableSurface>
      </div>
    </div>
  );
}
