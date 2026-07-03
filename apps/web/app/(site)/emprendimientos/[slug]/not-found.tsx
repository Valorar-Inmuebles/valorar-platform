import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";

export default function DevelopmentNotFound() {
  return (
    <SiteContainer className="py-20 text-center">
      <h1 className="text-2xl font-semibold text-text-primary">
        Emprendimiento no encontrado
      </h1>
      <p className="mt-3 text-text-secondary">
        El emprendimiento que buscás no existe o ya no está disponible.
      </p>
      <Link
        href="/emprendimientos"
        className="mt-6 inline-flex text-sm font-medium text-brand-green hover:underline"
      >
        Ver todos los emprendimientos
      </Link>
    </SiteContainer>
  );
}
