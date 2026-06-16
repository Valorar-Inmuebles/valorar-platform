"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { importClientesFromFile } from "@/lib/api/cliente.api";

const ACCEPTED_EXTENSIONS = [".txt", ".csv"];

function isAcceptedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function ImportarClientesPanel() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handlePickFile = () => {
    inputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFile(file);
    event.target.value = "";
  };

  const handleImport = async () => {
    if (!selectedFile) {
      handlePickFile();
      return;
    }

    if (!isAcceptedFile(selectedFile)) {
      toast.error("Solo se permiten archivos .txt o .csv");
      return;
    }

    setLoading(true);
    try {
      const result = await importClientesFromFile(selectedFile);
      toast.success(
        `Archivo procesado: ${result.lineCount} línea${result.lineCount === 1 ? "" : "s"} - Clientes importados: ${result.importCount}`,
      );
      setSelectedFile(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al importar clientes");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card flat className="max-w-lg">
      <CardHeader>
        <CardTitle>Importación de clientes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">
          Adjuntá un archivo de texto (.txt) o valores separados por coma (.csv) para
          importar clientes.
        </p>

        <input
          ref={inputRef}
          type="file"
          accept=".txt,.csv,text/plain,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />

        {selectedFile ? (
          <p className="text-sm text-gray-700">
            Archivo seleccionado:{" "}
            <span className="font-medium text-gray-900">{selectedFile.name}</span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={handlePickFile}
            disabled={loading}
          >
            Elegir archivo
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            loading={loading}
            onClick={handleImport}
          >
            Importar clientes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
