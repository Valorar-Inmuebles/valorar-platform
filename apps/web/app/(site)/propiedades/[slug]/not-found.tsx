import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";

export default function PropertyNotFound() {
  return (
    <SiteContainer className="flex flex-1 flex-col items-center justify-center py-24 text-center">
      <p className="text-sm font-medium uppercase tracking-wide text-primary">
        Error 404
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-foreground">
        Propiedad no encontrada
      </h1>
      <p className="mt-3 max-w-md text-muted">
        La propiedad que buscás no existe, no está publicada o fue retirada del
        catálogo.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/propiedades"
          className="inline-flex items-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ver propiedades
        </Link>
        <Link
          href="/"
          className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Volver al inicio
        </Link>
      </div>
    </SiteContainer>
  );
}
