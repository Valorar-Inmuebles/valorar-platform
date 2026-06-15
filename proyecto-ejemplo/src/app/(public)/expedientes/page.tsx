"use client";

import { useRouter } from "next/navigation";
import MainLayout from "@/components/layout/MainLayout";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardHeaderActions,
} from "@/components/ui/card";

import { TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

import { Icon } from "@/components/ui/icons";

function PlusSmIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
      <path d="M6 2v8M2 6h8" />
    </svg>
  );
}

function DotsVerticalIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="size-4">
      <circle cx="8" cy="3.5" r="1.25" />
      <circle cx="8" cy="8" r="1.25" />
      <circle cx="8" cy="12.5" r="1.25" />
    </svg>
  );
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-100 text-blue-600",
    "bg-green-100 text-green-600",
    "bg-purple-100 text-purple-600",
    "bg-orange-100 text-orange-600",
    "bg-pink-100 text-pink-600",
  ];

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
}

const EXPEDIENTES = [
  {
    id: "1",
    numero: "EXP-2024-000123",
    caratula: "García, Juan Carlos c/ Empresa XYZ S.A.",
    estado: "En trámite",
    responsable: "María López",
    fecha: "15 may",
  },
  {
    id: "2",
    numero: "EXP-2024-000124",
    caratula: "Pérez, Ana c/ Banco Nación",
    estado: "Audiencia",
    responsable: "Carlos Ruiz",
    fecha: "12 may",
  },
  {
    id: "3",
    numero: "EXP-2024-000125",
    caratula: "Gómez, Luis c/ ART SURA",
    estado: "Finalizado",
    responsable: "Ana García",
    fecha: "01 may",
  },
];

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === "En trámite") return <Badge variant="warning">En trámite</Badge>;
  if (estado === "Audiencia") return <Badge variant="info">Audiencia</Badge>;
  if (estado === "Finalizado") return <Badge variant="success">Finalizado</Badge>;

  return <Badge variant="neutral">{estado}</Badge>;
}

export default function ExpedientesPage() {
  const router = useRouter();

  return (
    <MainLayout>
      <div className="space-y-6 mx-auto px-6">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-gray-900">
            Expedientes
          </h1>

          <Button variant="primary" leftIcon={<PlusSmIcon />}>
            Nuevo expediente
          </Button>
        </div>

        {/* LIST */}
        <Card flat>

          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Listado</CardTitle>
              <Badge variant="neutral">{EXPEDIENTES.length}</Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">

                <TableHeader>
                  <TableRow>
                    <TableCell isHeader className="pl-4">Expediente</TableCell>
                    <TableCell isHeader>Responsable</TableCell>
                    <TableCell isHeader>Estado</TableCell>
                    <TableCell isHeader>Última actividad</TableCell>
                    <TableCell isHeader align="right" className="pr-4">
                      Acciones
                    </TableCell>
                  </TableRow>
                </TableHeader>

                <tbody>
                  {EXPEDIENTES.map((exp) => (
                    <TableRow
                      key={exp.id}
                      className="cursor-pointer hover:bg-gray-50"
                    >

                      {/* EXPEDIENTE */}
                      <TableCell className="pl-4 py-3">
                        <div
                          onClick={() => router.push("/expedientes/demo")}
                          className="flex flex-col"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {exp.numero}
                          </span>

                          <span className="text-xs text-gray-500 truncate max-w-[300px]">
                            {exp.caratula}
                          </span>
                        </div>
                      </TableCell>

                      {/* RESPONSABLE */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Avatar
                            usuarioId=""
                            name={exp.responsable}
                            size="sm"
                            className={getAvatarColor(exp.responsable)}
                          />
                          <span className="text-xs text-gray-600">
                            {exp.responsable}
                          </span>
                        </div>
                      </TableCell>

                      {/* ESTADO */}
                      <TableCell className="py-3">
                        <EstadoBadge estado={exp.estado} />
                      </TableCell>

                      {/* FECHA */}
                      <TableCell className="py-3">
                        <span className="text-xs text-gray-400">
                          {exp.fecha}
                        </span>
                      </TableCell>

                      {/* ACCIONES */}
                      <TableCell align="right" className="pr-4 py-3">

                        <div className="flex items-center justify-end gap-1">

                          <button
                            onClick={() => router.push("/expedientes/demo")}
                            className="flex size-7 items-center justify-center rounded text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                          >
                            <Icon.Edit className="size-3.5" />
                          </button>

                          <button className="flex size-7 items-center justify-center rounded text-gray-300 hover:bg-gray-100 hover:text-gray-700">
                            <DotsVerticalIcon />
                          </button>

                        </div>

                      </TableCell>

                    </TableRow>
                  ))}
                </tbody>

              </table>
            </div>

          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}