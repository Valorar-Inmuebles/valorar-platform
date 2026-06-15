import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { TenantsTable } from "@/components/modules/tenants/tenants-table";
import { ToastrFeedback } from "@/components/feedback/toastr-feedback";
import { tenantService } from "@/lib/server/services/tenant.service";

type Props = {
  searchParams: Promise<{ success?: string; error?: string }>;
};

const BASE_PATH = "/tenants";

export default async function TenantsPage({ searchParams }: Props) {
  const ctx = await requireAuth();

  if (!isSuperUsuario(ctx)) {
    return <p className="text-sm text-zinc-500">No autorizado</p>;
  }

  const tenants = await tenantService.getAll(ctx);
  const params = await searchParams;

  return (
    <div className="space-y-8">
      <ToastrFeedback success={params.success} error={params.error} />

      <PageHeader
        title="Tenants"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Tenants" },
        ]}
      />

      <TenantsTable tenants={tenants} basePath={BASE_PATH} />
    </div>
  );
}
