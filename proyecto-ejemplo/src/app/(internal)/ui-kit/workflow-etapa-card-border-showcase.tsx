"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  WORKFLOW_ETAPA_CARD_SURFACE_CLASS,
  WORKFLOW_ETAPA_COLOR_LABELS,
} from "@/components/modules/workflows/workflow-etapa-colors";
import { WorkflowEtapaOrderBadge } from "@/components/modules/workflows/workflow-etapa-order-badge";
import { WORKFLOW_ETAPA_COLORES, type WorkflowEtapaColor } from "@/lib/types/workflow";

const SAMPLE_ETAPAS: Array<{
  position: number;
  nombre: string;
  color: WorkflowEtapaColor;
  tipo: "inicial" | "normal" | "final";
}> = [
  { position: 1, nombre: "Demanda", color: "primary", tipo: "inicial" },
  { position: 2, nombre: "Contestación", color: "success", tipo: "normal" },
  { position: 3, nombre: "Pruebas", color: "warning", tipo: "normal" },
  { position: 4, nombre: "Sentencia", color: "danger", tipo: "final" },
];

function TipoBadge({ tipo }: { tipo: (typeof SAMPLE_ETAPAS)[number]["tipo"] }) {
  if (tipo === "inicial") return <Badge variant="info">Inicial</Badge>;
  if (tipo === "final") return <Badge variant="success">Final</Badge>;
  return <Badge variant="neutral">Normal</Badge>;
}

export function WorkflowEtapaCardBorderShowcase() {
  return (
    <div className="space-y-4">
      <p className="text-xs text-zinc-500">
        Paso 6 — card de etapa con{" "}
        <code className="text-zinc-600">border-*-200 bg-*-50</code> + tabla
        interna blanca.
      </p>
      <div className="max-w-xl space-y-3">
        {SAMPLE_ETAPAS.map((etapa) => (
          <div
            key={etapa.position}
            className={`overflow-hidden rounded-xl border ${WORKFLOW_ETAPA_CARD_SURFACE_CLASS[etapa.color]}`}
          >
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2.5">
                <WorkflowEtapaOrderBadge
                  position={etapa.position}
                  color={etapa.color}
                />
                <CardTitle className="text-sm font-medium text-zinc-900">
                  {etapa.nombre}
                </CardTitle>
                <TipoBadge tipo={etapa.tipo} />
              </div>
              <Button type="button" variant="secondary" size="sm" className="shrink-0">
                Agregar tarea
              </Button>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-center text-xs text-zinc-500">
                Tabla de tareas · {WORKFLOW_ETAPA_COLOR_LABELS[etapa.color]}
              </div>
            </CardContent>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-4 py-3 text-xs text-zinc-600">
        <p className="font-medium text-zinc-800">Paleta</p>
        <p className="mt-1">
          {WORKFLOW_ETAPA_COLORES.map((c) => WORKFLOW_ETAPA_COLOR_LABELS[c]).join(
            " · ",
          )}
        </p>
      </div>
    </div>
  );
}
