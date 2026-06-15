"use client";

import Link from "next/link";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Algo salió mal
      </h1>
      <p className="mt-3 max-w-md text-sm text-muted">
        Ocurrió un error inesperado. Podés intentar de nuevo o volver al
        inicio.
      </p>
      {process.env.NODE_ENV === "development" && error.message ? (
        <p className="mt-4 max-w-lg text-left text-xs text-red-600">
          {error.message}
        </p>
      ) : null}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Reintentar
        </button>
        <Link
          href="/"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
