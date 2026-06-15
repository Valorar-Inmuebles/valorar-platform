"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getAnsesOverview } from "@/lib/api/anses.api";
import type { AnsesOverviewDto } from "@/lib/types/anses-dashboard";
import { PageHeader } from "@/components/ui/page-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import { AnsesClienteSearch } from "@/components/modules/automatizaciones/anses-cliente-search";
import { AnsesOverviewAside } from "@/components/modules/automatizaciones/anses-overview-aside";

function OverviewCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export default function AnsesSearchPage() {
  const router = useRouter();
  const [overview, setOverview] = useState<AnsesOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getAnsesOverview();
        if (!cancelled) setOverview(data);
      } catch (e: unknown) {
        if (!cancelled) {
          setOverview(null);
          setError(e instanceof Error ? e.message : "Error al cargar resumen");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <PageHeader
          title="Legajos ANSES"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Automatizaciones" },
            { label: "Legajos ANSES" },
          ]}
        />
        <p className="text-sm text-gray-500">
          Consulta y gestiona información oficial de ANSES por cliente.
        </p>

        <AnsesClienteSearch
          onSelect={(cliente) => router.push(`/automatizaciones/anses/${cliente.id}`)}
        />

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {loading || !overview ? (
        <OverviewCardsSkeleton />
      ) : (
        <AnsesOverviewAside {...overview} />
      )}
    </div>
  );
}
