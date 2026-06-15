"use client";

import { useEffect, useMemo, useState } from "react";
import { getFueros } from "@/lib/api/fueros";
import { getJurisdicciones } from "@/lib/api/jurisdicciones";
import { getObjetosByFuero } from "@/lib/api/objetos";
import { getWorkflowRoles } from "@/lib/api/workflow-roles";
import { getWorkflowTipos } from "@/lib/api/workflow-tipos";
import type { WorkflowDetailDto } from "@/lib/types/workflow";

export type WorkflowClassificationLabels = {
  tipo: string;
  jurisdiccion: string;
  fuero: string;
  objeto: string;
  rol: string;
};

const EMPTY_LABELS: WorkflowClassificationLabels = {
  tipo: "—",
  jurisdiccion: "—",
  fuero: "—",
  objeto: "—",
  rol: "—",
};

function pickLabel(
  map: Map<string, string>,
  id: string | null | undefined,
): string {
  if (!id) return "—";
  return map.get(id)?.trim() || "—";
}

export function useWorkflowClassificationLabels(
  workflow: WorkflowDetailDto | null,
): WorkflowClassificationLabels {
  const [tipoMap, setTipoMap] = useState<Map<string, string>>(new Map());
  const [rolMap, setRolMap] = useState<Map<string, string>>(new Map());
  const [jurisdiccionMap, setJurisdiccionMap] = useState<Map<string, string>>(
    new Map(),
  );
  const [fueroMap, setFueroMap] = useState<Map<string, string>>(new Map());
  const [objetoMap, setObjetoMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getWorkflowTipos(),
      getWorkflowRoles(),
      getJurisdicciones(),
      getFueros(),
    ])
      .then(([tipos, roles, jurisdicciones, fueros]) => {
        if (cancelled) return;
        setTipoMap(new Map(tipos.map((row) => [row.id, row.nombre])));
        setRolMap(new Map(roles.map((row) => [row.id, row.nombre])));
        setJurisdiccionMap(
          new Map(
            jurisdicciones.map((row) => [row.id, row.nombre?.trim() || "—"]),
          ),
        );
        setFueroMap(new Map(fueros.map((row) => [row.id, row.nombre])));
      })
      .catch(() => {
        if (cancelled) return;
        setTipoMap(new Map());
        setRolMap(new Map());
        setJurisdiccionMap(new Map());
        setFueroMap(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workflow?.fuero_id) {
      setObjetoMap(new Map());
      return;
    }

    let cancelled = false;

    getObjetosByFuero(workflow.fuero_id)
      .then((rows) => {
        if (cancelled) return;
        setObjetoMap(new Map(rows.map((row) => [row.id, row.nombre])));
      })
      .catch(() => {
        if (cancelled) return;
        setObjetoMap(new Map());
      });

    return () => {
      cancelled = true;
    };
  }, [workflow?.fuero_id]);

  return useMemo(() => {
    if (!workflow) return EMPTY_LABELS;

    return {
      tipo: pickLabel(tipoMap, workflow.workflow_tipo_id),
      jurisdiccion: pickLabel(jurisdiccionMap, workflow.jurisdiccion_id),
      fuero: pickLabel(fueroMap, workflow.fuero_id),
      objeto: pickLabel(objetoMap, workflow.objeto_id),
      rol: pickLabel(rolMap, workflow.workflow_rol_id),
    };
  }, [workflow, tipoMap, rolMap, jurisdiccionMap, fueroMap, objetoMap]);
}
