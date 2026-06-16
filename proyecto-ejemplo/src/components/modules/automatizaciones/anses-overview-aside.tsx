import type { ReactNode } from "react";

import type { AnsesOverviewDto } from "@/lib/types/anses-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";

const LOG_DOT_COLORS = {
  green: "bg-green-500",
  orange: "bg-orange-400",
  red: "bg-red-500",
  blue: "bg-blue-500",
} as const;

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-xs text-gray-400">{label}</span>
      <span className="text-right text-xs font-medium text-gray-700">{value}</span>
    </div>
  );
}

type AnsesOverviewAsideProps = AnsesOverviewDto;

export function AnsesOverviewAside({
  integracion,
  metricas,
  logs,
}: AnsesOverviewAsideProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card flat>
        <CardHeader>
          <CardTitle>Estado de la integración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span
              className={`size-2 rounded-full ${
                integracion.activa ? "bg-green-500" : "bg-gray-300"
              }`}
            />
            <span className="font-medium text-gray-800">
              {integracion.activa ? "Integración activa" : "Integración inactiva"}
            </span>
          </div>
          <InfoRow label="Última sync Clientes" value={integracion.ultimaSyncClientes} />
          <InfoRow label="Próxima sync Clientes" value={integracion.proximaSyncClientes} />
          <InfoRow label="Última sync Sentencias" value={integracion.ultimaSyncSentencias} />
          <InfoRow label="Próxima sync Sentencias" value={integracion.proximaSyncSentencias} />
          <InfoRow label="Procesando actualmente" value={integracion.corriendo ? "Sí" : "No"} />
        </CardContent>
      </Card>

      <Card flat>
        <CardHeader>
          <CardTitle>{metricas.titulo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {metricas.items.map((m) => (
            <div
              key={m.label}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-gray-500">{m.label}</span>
              <span className="font-semibold tabular-nums text-gray-900">
                {m.value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card flat>
        <CardHeader>
          <CardTitle>Logs recientes</CardTitle>
          <Button variant="ghost" size="sm">
            {logs.verTodoLabel}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-0">
          {logs.items.map((log) => (
            <div
              key={log.id}
              className="flex gap-2 border-b border-gray-50 px-5 py-3 last:border-0"
            >
              <span
                className={`mt-1.5 size-2 shrink-0 rounded-full ${LOG_DOT_COLORS[log.dotColor]}`}
              />
              <div className="min-w-0 space-y-0.5">
                <p className="text-xs text-gray-700">{log.mensaje}</p>
                <p className="text-xs text-gray-400">{log.timestamp}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
