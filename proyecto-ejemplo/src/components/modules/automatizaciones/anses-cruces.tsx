"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { getAnsesCruces } from "@/lib/api/anses-cruces.api";
import type { AnsesCrucesPageDto } from "@/lib/types/anses-cruces";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { TableHeader, TableRow, TableCell } from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icons";
import { AnsesFileDownload } from "@/components/modules/automatizaciones/anses-file-download";

function CrucesPageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

export default function CrucesPage() {
  const [data, setData] = useState<AnsesCrucesPageDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cruces = await getAnsesCruces();
      setData(cruces);
      setPage(1);
    } catch (e: unknown) {
      setData(null);
      setError(e instanceof Error ? e.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const slice = useMemo(() => {
    if (!data) return { rows: [], total: 0 };
    const start = (page - 1) * pageSize;
    return {
      rows: data.filas.slice(start, start + pageSize),
      total: data.total,
    };
  }, [data, page, pageSize]);

  if (loading) {
    return <CrucesPageSkeleton />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-6">
        <p className="text-sm text-red-700">{error ?? "No se pudieron cargar los datos"}</p>
        <Button variant="secondary" size="md" onClick={() => void load()}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={data.titulo}
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Automatizaciones" },
          { label: "Cruces ANSES" },
        ]}
      />
      <p className="text-sm text-gray-500">{data.subtitulo}</p>

      <Card flat>
        <CardHeader className="border-orange-100 bg-orange-50/80">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Icon.BarChart className="size-4 text-orange-600" />
            <CardTitle>{data.titulo}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TableHeader>
                <TableRow>
                  <TableCell isHeader>Período</TableCell>
                  <TableCell isHeader>Fecha de ejecución</TableCell>
                  <TableCell isHeader>Clientes procesados</TableCell>
                  <TableCell isHeader>Estado</TableCell>
                  <TableCell isHeader>Archivo</TableCell>
                </TableRow>
              </TableHeader>
              <tbody>
                {slice.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.periodo}</TableCell>
                    <TableCell>{row.fechaEjecucion}</TableCell>
                    <TableCell>{row.clientesProcesados}</TableCell>
                    <TableCell>
                      <Badge variant={row.estado.variant}>{row.estado.label}</Badge>
                    </TableCell>
                    <TableCell>
                      {row.archivoUrl && row.archivoNombre && (
                        <AnsesFileDownload
                          url={row.archivoUrl}
                          filename={row.archivoNombre}
                          label={row.archivoNombre}
                        />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
          <div className="border-t border-gray-100 px-5 py-3">
            <Pagination
              page={page}
              pageSize={pageSize}
              total={slice.total}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
