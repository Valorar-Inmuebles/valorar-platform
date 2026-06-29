"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-8">
      <Card className="w-full border-border bg-surface">
        <CardHeader>
          <CardTitle>No pudimos cargar esta página</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted">
            Ocurrió un error inesperado. Si la API no está disponible, verificá
            que el servidor esté corriendo e intentá de nuevo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={reset}>
              Reintentar
            </Button>
            <Link href="/">
              <Button variant="secondary">Ir al inicio</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline-secondary">Iniciar sesión</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
