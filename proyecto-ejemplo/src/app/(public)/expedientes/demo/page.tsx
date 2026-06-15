"use client";

import type { BadgeVariant } from "@/components/ui/badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardHeaderActions,
} from "@/components/ui/card";
import { TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Checkbox } from "@/components/ui/checkbox";
import MainLayout from "@/components/layout/MainLayout";
import { useState } from "react";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { ContextIcon } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ComentariosPanel } from "@/components/modules/comentarios";

// ── Avatars ─────────────────────────────────────────────────────────────────
function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-100 text-blue-600 shadow-inner",
    "bg-green-100 text-green-600 shadow-inner",
    "bg-purple-100 text-purple-600 shadow-inner",
    "bg-orange-100 text-orange-600 shadow-inner",
    "bg-pink-100 text-pink-600 shadow-inner",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

// ── Status / priority cells ───────────────────────────────────────────────────

type TaskStatus = "Pendiente" | "En progreso" | "Programada" | "Realizada";
type TaskPriority = "Alta" | "Media" | "Baja";

const STATUS_COLORS: Record<TaskStatus, string> = {
  "Pendiente": "bg-yellow-100 text-yellow-700",
  "En progreso": "bg-blue-100 text-blue-700",
  "Programada": "bg-gray-100 text-gray-600",
  "Realizada": "bg-green-100 text-green-700",
};

const STATUS_OPTIONS: TaskStatus[] = ["Pendiente", "En progreso", "Programada", "Realizada"];

function StatusCell({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange?: (value: TaskStatus) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition ${STATUS_COLORS[status]}`}
      >
        {status}
        <Icon.ChevronDown className="size-2.5" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="min-w-[140px] right-0">
        {STATUS_OPTIONS.map((s) => (
          <DropdownMenuItem
            key={s}
            onClick={() => onChange?.(s)}
            className="flex items-center justify-between gap-2"
          >
            <span>{s}</span>

            {/* indicador de color */}
            <span
              className={`h-2 w-2 rounded-full ${
                  s === "Pendiente"
                  ? "bg-yellow-500"
                  : s === "En progreso"
                  ? "bg-blue-500"
                  : s === "Realizada"
                  ? "bg-green-500"
                  : "bg-gray-400"
              }`}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityCell({ priority }: { priority: TaskPriority }) {
  if (priority === "Alta")
    return <Badge variant="danger">Alta</Badge>;
  if (priority === "Media")
    return <Badge variant="warning">Media</Badge>;
  return <Badge variant="neutral">Baja</Badge>;
}

function ActuacionTypeIcon({ type }: { type: "document" | "briefcase" | "scales" }) {
  if (type === "briefcase") return <Icon.Briefcase className="size-3.5" />;
  return <Icon.File className="size-3.5 shrink-0 text-gray-400" />;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const TEAM = ["Ana García", "Carlos Ruiz", "Laura Medina"];

const TIMELINE_STEPS: Array<{
  label: string;
  status: "done" | "current" | "pending";
  date?: string;
}> = [
  { label: "Inicio", status: "done", date: "12/03/2025" },
  { label: "Reclamo administrativo", status: "done", date: "18/03/2025" },
  { label: "En análisis ANSES",  status: "done", date: "25/03/2025" },
  { label: "Observado",  status: "current", date: "08/04/2025" },
  { label: "Respuesta a observación", status: "pending" },
  { label: "Resolución",  status: "pending" },
  { label: "Finalizado",  status: "pending" },
];

const TASKS: Array<{
  id: string; name: string; assigned: string;
  date: string; priority: TaskPriority; status: TaskStatus;
}> = [
  { id: "t1", name: "Responder observación ANSES",    assigned: "María López",  date: "15 may", priority: "Alta",  status: "Pendiente"    },
  { id: "t2", name: "Revisar historia laboral actualizada",    assigned: "Ana García",   date: "18 may", priority: "Media", status: "En progreso"  },
  { id: "t3", name: "Solicitar recibos de haberes",  assigned: "Carlos Ruiz",  date: "20 may", priority: "Media",  status: "Pendiente"   },
  { id: "t4", name: "Calculadora de movilidad", assigned: "Laura Medina", date: "22 may", priority: "Baja",  status: "Pendiente"    },
  { id: "t5", name: "Control de topes y mínimos",    assigned: "Ana García",   date: "18 may", priority: "Baja", status: "Pendiente"   },
  { id: "t6", name: "Redactar presentación complementaria",  assigned: "Carlos Ruiz",  date: "20 may", priority: "Alta",  status: "Pendiente"   },
  { id: "t7", name: "Subir documentación a mi ANSES", assigned: "Laura Medina", date: "22 may", priority: "Media",  status: "Pendiente"    },
  { id: "t8", name: "Seguimiento de trámite", assigned: "Laura Medina", date: "22 may", priority: "Baja",  status: "Pendiente"    },
];

const DOCS: Array<{
  id: string; nombre: string; tipo: string;
  subidoPor: string; fecha: string; tamaño: string;
}> = [
  { id: "d1", nombre: "Escrito inicial.pdf",        tipo: "Escrito",       subidoPor: "María López",  fecha: "10 abr", tamaño: "245 KB" },
  { id: "d2", nombre: "Contrato laboral.pdf",       tipo: "Contrato",      subidoPor: "Ana García",   fecha: "12 abr", tamaño: "1.2 MB" },
  { id: "d3", nombre: "Liquidación final.xlsx",     tipo: "Planilla",      subidoPor: "Carlos Ruiz",  fecha: "15 abr", tamaño: "88 KB"  },
  { id: "d4", nombre: "Notificación juzgado.pdf",   tipo: "Notificación",  subidoPor: "Laura Medina", fecha: "02 may", tamaño: "52 KB"  },
];

const ACTUACIONES: Array<{
  id: string; day: string; month: string; title: string; desc: string;
  variant: BadgeVariant; badge: string; type: "document" | "briefcase" | "scales";
}> = [
  { id: "a1", day: "08", month: "ABR", title: "Observación de ANSES",    desc: "Se recibió observación sobre documentación presentada.",     variant: "success", badge: "Procesada",   type: "document"   },
  { id: "a2", day: "02", month: "ABR", title: "Presentación incial",     desc: "Se presentó reclamo por diferencia de haberes.",   variant: "neutral", badge: "Informativa", type: "briefcase"  },
  { id: "a3", day: "01", month: "ABR", title: "Carga de documentación",  desc: "Se adjuntó documentación requerida.",                 variant: "success", badge: "Procesada",   type: "document"   },
  { id: "a4", day: "25", month: "MAR", title: "Pase a análisis",         desc: "El expediente fue derivado para nálisis técnico.",          variant: "warning", badge: "Pendiente",   type: "scales"     },
];

const grouped = {
  nuevas: ACTUACIONES.slice(0, 1),
  semana: ACTUACIONES.slice(1, 3),
  anteriores: ACTUACIONES.slice(3),
};

const DEMO_EXPEDIENTE_ID = "7405e706-99af-4456-b9c1-799e80bf1b7e";

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ExpedientesDemoPage() {

  const [tasks, setTasks] = useState(TASKS);
  const [showDetails, setShowDetails] = useState(false);

  function InfoRow({
    label,
    value,
  }: {
    label: string;
    value: React.ReactNode;
  }) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-xs font-medium text-gray-700">{value}</span>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 mx-auto px-6">

        {/* ── HEADER ───────────────────────────────────────────────────────── */}
        <div className="mb-8 space-y-4">

        <div className="flex flex-col gap-4">

        {/* TOP ROW */}
        <div className="flex items-start justify-between gap-4">

          {/* LEFT */}
          <div className="flex items-start gap-3 min-w-0 flex-1">

            <ContextIcon tone="primary" size="md" className="lg:size-12">
              <Icon.Folder className="size-5 lg:size-7" />
            </ContextIcon>

            <div className="space-y-1 min-w-0 flex-1">

              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg lg:text-2xl font-semibold text-gray-900 truncate">
                  EXP-2025-000123
                </h1>

                <Badge variant="success">En trámite</Badge>
              </div>

              <p className="text-sm lg:text-base font-medium text-gray-600 leading-snug truncate">
                Pérez, Marta Alicia / Reajuste de haberes
              </p>

            </div>
          </div>

          {/* ACTIONS (SIEMPRE ARRIBA) */}
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="md" className="whitespace-nowrap">
              Editar
            </Button>

            <Button variant="primary" size="md" className="whitespace-nowrap">
              <span className="hidden sm:inline">Cambiar estado</span>
              <span className="sm:hidden">Estado</span>
            </Button>
          </div>

        </div>

        {/* SECOND ROW (META + USERS) */}
        <div className="flex flex-wrap items-center justify-between gap-3">

          {/* META */}
          <div className="flex flex-wrap items-center gap-3 text-xs lg:text-sm text-gray-400">

            <div className="flex items-center gap-1.5">
              <Icon.Folder className="size-4" />
              <span>Fuero: Seguridad Social</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Icon.Folder className="size-4" />
              <span>Objeto: Reajuste de haberes</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Icon.Folder className="size-4" />
              <span>Tipo: Administrativo</span>
            </div>

            <div className="flex items-center gap-1.5">
              <Icon.Folder className="size-4" />
              <span>Origen: ANSES</span>
            </div>

            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center size-6 rounded-md border border-gray-200 bg-white text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
            >
              <Icon.ChevronDown
                className={`size-3 transition-transform ${
                  showDetails ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* USERS */}
          <div className="flex flex-wrap items-center gap-4">

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">
                Responsable
              </span>

              <Avatar
                usuarioId=""
                name="María López"
                size="sm"
                className={getAvatarColor("María López")}
              />

              <span className="text-sm text-gray-700 font-medium">
                María López
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 hidden sm:inline">
                Equipo
              </span>

              <div className="flex items-center -space-x-2">
                {TEAM.map((name) => (
                  <Avatar
                    key={name}
                    usuarioId=""
                    name={name}
                    size="sm"
                    className={getAvatarColor(name)}
                  />
                ))}

                  <ActionIconButton>
                    <Icon.PlusSm className="size-3" />
                  </ActionIconButton>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Icon.Clock className="size-3.5" />
              <span className="hidden sm:inline">Hace 2 horas</span>
            </div>

          </div>

        </div>

        </div>
        </div>

        {showDetails && (
        <div className="mt-2">
          <Card>
            <CardContent className="p-5">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 text-sm">

                {/* COLUMNA 1 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase">
                    Información del caso
                  </p>

                  <InfoRow label="Cliente" value="Pérez, Marta Alicia" />
                  <InfoRow label="Número de caso" value="CAS-2025-000087" />
                  <InfoRow label="Fecha de inicio" value="12/03/2025" />
                  <InfoRow label="Estado" value="En trámite" />
                  <InfoRow label="Prioridad" value={<Badge variant="danger">Alta</Badge>} />
                </div>

                {/* COLUMNA 2 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase">
                    Información del expediente
                  </p>

                  <InfoRow label="Número" value="024-25-05678932-1" />
                  <InfoRow label="Organismo" value="ANSES" />
                  <InfoRow label="Trámite" value="Reajuste de haberes" />
                  <InfoRow label="Fecha de inicio" value="12/03/2025" />
                  <InfoRow label="Instancia" value="Administrativa" />
                </div>

                {/* COLUMNA 3 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase">
                    Cliente
                  </p>

                  <InfoRow label="Nombre" value="Pérez, Marta Alicia" />
                  <InfoRow label="DNI" value="14.287.654" />
                  <InfoRow label="Teléfono" value="+54 11 4444-5555" />
                  <InfoRow label="Email" value="marta.perez@email.com" />
                  <InfoRow label="Domicilio" value="Av. Rivadavia 1234, CABA" />
                </div>

                {/* COLUMNA 4 */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase">
                    Datos adicionales
                  </p>

                  <InfoRow label="Motivo" value="Diferencias por movilidad" />
                  <InfoRow label="Período reclamado" value="03/2021 - 02/2025" />
                  <InfoRow label="Monto estimado" value="$ 3.245.876,40" />
                  <InfoRow
                    label="Etiquetas"
                    value={
                      <div className="flex gap-1">
                        <Badge variant="neutral">Movilidad</Badge>
                        <Badge variant="neutral">Haberes</Badge>
                        <Badge variant="neutral">Diferencias</Badge>
                      </div>
                    }
                  />
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
        )}

        {/* ── TIMELINE ─────────────────────────────────────────────────────── */}
        <Card flat>
          <CardContent className="pt-6 pb-3">
            <div className="-mx-6 flex items-start">

              {TIMELINE_STEPS.map((step, i) => (
                <div key={step.label} className="flex flex-1 flex-col items-center">

                  {/* ROW SUPERIOR */}
                  <div className="relative flex items-center justify-center w-full">

                    {/* LÍNEA IZQUIERDA */}
                    {i !== 0 && (
                      <div
                        className={`absolute left-0 right-1/2 h-px top-1/2 -translate-y-1/2 ${
                          step.status === "done" ? "bg-blue-200" : "bg-gray-200"
                        }`}
                      />
                    )}

                    {/* LÍNEA DERECHA */}
                    {i !== TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`absolute left-1/2 right-0 h-px top-1/2 -translate-y-1/2 ${
                          step.status === "done" ? "bg-blue-200" : "bg-gray-200"
                        }`}
                      />
                    )}

                    {/* CÍRCULO */}
                    <div
                      className={`relative z-10 flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        step.status === "done"
                          ? "bg-blue-500 text-white"
                          : step.status === "current"
                            ? "bg-white ring-2 ring-blue-500 text-blue-600"
                            : "bg-gray-100 text-gray-400 ring-1 ring-gray-200"
                      }`}
                    >
                      {step.status === "done" ? <Icon.CheckDone className="size-2.5" /> : i + 1}
                    </div>

                  </div>

                  {/* ROW TEXTO */}
                  <div className="mt-3.5 flex flex-col items-center gap-0.5 text-center">
                    <span
                      className={`max-w-[90px] text-xs leading-snug ${
                        step.status === "current"
                          ? "font-semibold text-blue-600"
                          : step.status === "done"
                            ? "font-medium text-gray-500"
                            : "text-gray-400"
                      }`}
                    >
                      {step.label}
                    </span>

                    {step.date && (
                      <span className="text-[10px] tabular-nums text-gray-400">
                        {step.date}
                      </span>
                    )}
                  </div>

                </div>
              ))}

            </div>
          </CardContent>
        </Card>

        {/* ── 2-ACCIONES ───────────────────────────────────────────── */}
        <Card flat>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4">

              {/* ITEM */}
              <div className="space-y-2 px-4 first:pl-0 last:pr-0 xl:border-r xl:border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Icon.Folder className="size-4.5" />
                  <span>Próxima acción</span>
                </div>

                <p className="text-md font-semibold text-gray-900">
                  Responder observación ANSES
                </p>

                <p className="text-xs text-gray-500">
                  Vence el <span className="text-gray-800">22/04/2025</span>
                </p>

                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="primary">Ir a tarea</Button>
                  <Button size="sm" variant="secondary">Completar</Button>
                </div>
              </div>

              <div className="space-y-2 px-4 first:pl-0 last:pr-0 xl:border-r xl:border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Icon.Folder className="size-4.5" />
                  <span>Alertas</span>
                </div>

                <div className="space-y-1 text-xs text-gray-600">

                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-red-500" />
                    1 tarea vencida
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-orange-400" />
                    2 tareas próximas a vencer
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-orange-400" />
                     Respuesta a observación ANSES
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-gray-400" />
                     Sin movimiento hace 3 días
                  </div>

                </div>
              </div>

              <div className="space-y-2 px-4 first:pl-0 last:pr-0 xl:border-r xl:border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Icon.Folder className="size-4.5" />
                  <span>Estado del expediente</span>
                </div>

                <p className="text-sm font-semibold text-green-600">
                  En trámite
                </p>

                <p className="text-xs text-gray-400">Etapa 4 de 7</p>

                <ProgressBar value={43} />
              </div>

              <div className="space-y-2 px-4 first:pl-0 last:pr-0">
                <div className="flex items-center gap-1.5">
                  <Icon.Folder className="size-4.5" />
                  <span>Último movimiento</span>
                </div>

                <p className="text-sm font-semibold text-gray-900">
                  Observación de ANSES
                </p>

                <p className="text-xs text-gray-400">
                  Hace 2 días (08/04/2025)
                </p>

                <p className="text-xs text-gray-500 italic">
                  "Se recibió observación sobre documentación presentada ..."
                </p>

                <div className="pt-1">
                  <Button size="sm" variant="secondary">
                    Ver actuación
                  </Button>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* ── 2-COLUMN MAIN GRID ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* 1. TAREAS */}
          <Card flat>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Tareas</CardTitle>
                <Badge variant="neutral">{TASKS.length}</Badge>
              </div>
              <CardHeaderActions>
                <Button variant="outline-primary" size="md" leftIcon={<Icon.PlusSm className="size-3" />}>
                  Nueva tarea
                </Button>
              </CardHeaderActions>
            </CardHeader>

            {/* Tabs */}
            <div className="px-4 pt-3 pb-3">
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                {["Todas", "Mías", "Vencidas"].map((tab) => (
                  <button
                    key={tab}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      tab === "Todas"
                        ? "bg-white shadow text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="w-8 pl-4" />
                    <TableCell isHeader>Tarea</TableCell>
                    <TableCell isHeader>Asignado a</TableCell>
                    <TableCell isHeader>Vence</TableCell>
                    <TableCell isHeader align="center">Prioridad</TableCell>
                    <TableCell isHeader align="center" className="pr-4">Estado</TableCell>
                    <TableCell isHeader align="right" className="pr-4">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {tasks.map((task, index) => (
                    <TableRow key={task.id}>
                      <TableCell className="w-8 pl-4 py-2">
                        <Checkbox size="sm" readOnly />
                      </TableCell>
                      <TableCell className="py-2">
                      <span className="text-sm font-medium text-gray-900">{task.name}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar usuarioId="" name={task.assigned} size="sm" />
                          <span className="text-xs text-gray-500">{task.assigned.split(" ")[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs text-gray-400">{task.date}</span>
                      </TableCell>
                      <TableCell align="center" className="py-2">
                        <PriorityCell priority={task.priority} />
                      </TableCell>
                      <TableCell align="center" className="pr-4 py-2">
                        <StatusCell
                          status={task.status}
                          onChange={(newStatus) => {
                            const updated = [...tasks];
                            updated[index] = {
                              ...task,
                              status: newStatus,
                            };
                            setTasks(updated);
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" className="pr-4">
                        <div className="flex items-center justify-end gap-1">

                          {/* Edit */}
                          <button className="flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition">
                            <Icon.Edit className="size-3.5" />
                          </button>

                          {/* 3 dots siempre visible pero más tenue */}
                          <ActionIconButton>
                            <Icon.DotsVertical className="size-3.5" />
                          </ActionIconButton>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 2. ACTUACIONES */}
          <Card flat>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Actuaciones</CardTitle>
                <Badge variant="neutral">{ACTUACIONES.length}</Badge>
              </div>

              <CardHeaderActions>
                <Button variant="primary" size="md" leftIcon={<Icon.PlusSm className="size-3" />}>
                  Actuación
                </Button>
                <Button variant="outline-primary" size="md" leftIcon={<Icon.Refresh className="size-3.5" />}>
                  PJN
                </Button>
              </CardHeaderActions>
            </CardHeader>

            {/* Tabs */}
            <div className="px-4 pt-3 pb-3">
              <div className="inline-flex rounded-lg bg-gray-100 p-1">
                {["Todas", "PJN", "Manuales", "Con acción"].map((tab) => (
                  <button
                    key={tab}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition ${
                      tab === "Todas"
                        ? "bg-white shadow text-gray-900"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Agrupación mock */}
            {(() => {
              const grouped = {
                nuevas: ACTUACIONES.slice(0, 1),
                semana: ACTUACIONES.slice(1, 3),
                anteriores: ACTUACIONES.slice(3),
              };

              return (
                <div className="divide-y divide-gray-200">

                  {/* ── NUEVAS ── */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400">
                    Nuevas (1)
                  </div>

                  {grouped.nuevas.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 px-4 py-3 bg-green-50 border-y border-green-100"
                    >
                      {/* Fecha */}
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                        <span className="text-sm font-bold text-gray-900 leading-none">{act.day}</span>
                        <span className="mt-0.5 text-[10px] uppercase text-gray-400 leading-none">{act.month}</span>
                      </div>

                      {/* Icono */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400">
                        <ActuacionTypeIcon type={act.type} />
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold text-gray-900">
                            {act.title}
                          </p>

                          <div className="flex items-center gap-2">
                            <Badge variant="danger">Requiere acción</Badge>

                            <Button variant="primary" size="sm">
                              Crear tarea
                            </Button>

                            <Button variant="secondary" size="sm">
                              Ver doc
                            </Button>

                            <ActionIconButton>
                              <Icon.DotsVertical className="size-3.5" />
                            </ActionIconButton>
                          </div>
                        </div>

                        <p className="mt-1 text-sm text-gray-600">{act.desc}</p>

                        <p className="mt-1 text-xs text-gray-400">
                          ANSES
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* ── ESTA SEMANA ── */}
                  <div className="px-4 py-2 text-xs font-semibold text-blue-500">
                    Esta semana (2)
                  </div>

                  {grouped.semana.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      {/* Fecha */}
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                        <span className="text-sm font-bold text-gray-900 leading-none">{act.day}</span>
                        <span className="text-[10px] uppercase text-gray-400 leading-none">{act.month}</span>
                      </div>

                      {/* Icono */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400">
                        <ActuacionTypeIcon type={act.type} />
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {act.title}
                          </p>

                          <div className="flex items-center gap-2">
                            <Badge variant={act.variant}>{act.badge}</Badge>

                            <Button variant="secondary" size="sm">
                              Ver doc
                            </Button>

                            <ActionIconButton>
                              <Icon.DotsVertical className="size-3.5" />
                            </ActionIconButton>
                          </div>
                        </div>

                        <p className="mt-1 text-sm text-gray-600">{act.desc}</p>

                        <p className="mt-1 text-xs text-gray-400">
                          ANSES
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* ── ANTERIORES ── */}
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400">
                    Anteriores
                  </div>

                  {grouped.anteriores.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50"
                    >
                      {/* Fecha */}
                      <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                        <span className="text-sm font-bold text-gray-900 leading-none">{act.day}</span>
                        <span className="text-[10px] uppercase text-gray-400 leading-none">{act.month}</span>
                      </div>

                      {/* Icono */}
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-gray-400">
                        <ActuacionTypeIcon type={act.type} />
                      </div>

                      {/* Contenido */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-gray-900">
                            {act.title}
                          </p>

                          <div className="flex items-center gap-2">
                            <Badge variant={act.variant}>{act.badge}</Badge>

                            <ActionIconButton>
                              <Icon.DotsVertical className="size-3.5" />
                            </ActionIconButton>
                          </div>
                        </div>

                        <p className="mt-1 text-sm text-gray-600">{act.desc}</p>

                        <p className="mt-1 text-xs text-gray-400">
                          ANSES
                        </p>
                      </div>
                    </div>
                  ))}

                </div>
              );
            })()}
          </Card>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* 4. DOCUMENTOS */}
          <Card flat>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CardTitle>Documentos</CardTitle>
                <Badge variant="neutral">{DOCS.length}</Badge>
              </div>
              <CardHeaderActions>
                <Button variant="outline-primary" size="md" leftIcon={<Icon.PlusSm className="size-3" />}>
                  Subir documento
                </Button>
              </CardHeaderActions>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="pl-4">Nombre</TableCell>
                    <TableCell isHeader>Tipo</TableCell>
                    <TableCell isHeader>Subido por</TableCell>
                    <TableCell isHeader>Fecha</TableCell>
                    <TableCell isHeader align="right">Tamaño</TableCell>
                    <TableCell isHeader align="right" className="pr-4">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {DOCS.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="pl-4 py-2">
                        <div className="flex items-center gap-2">
                          <Icon.File className="size-3.5 shrink-0 text-gray-400" />
                          <span className="text-xs text-gray-900">{doc.nombre}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge variant="neutral">{doc.tipo}</Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1.5">
                          <Avatar usuarioId="" name={doc.subidoPor} size="sm" />
                          <span className="text-xs text-gray-500">{doc.subidoPor.split(" ")[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs text-gray-400">{doc.fecha}</span>
                      </TableCell>
                      <TableCell align="right" className="py-2">
                        <span className="text-xs tabular-nums text-gray-400">{doc.tamaño}</span>
                      </TableCell>
                      <TableCell align="right" className="pr-4 py-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <ActionIconButton>
                            <Icon.Download className="size-3.5" />
                          </ActionIconButton>
                          <ActionIconButton>
                            <Icon.DotsVertical className="size-3.5" />
                          </ActionIconButton>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          
          {/* 3. COMENTARIOS */}
          <ComentariosPanel
            entidadTipo="expediente"
            entidadId={DEMO_EXPEDIENTE_ID}
            variant="sidebar"
            maxVisible={2}
          />
         
        </div>
      </div>
    </MainLayout>
  );
}
