import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { ImportarClientesPanel } from "@/components/modules/varios/importar-clientes-panel";
import { AnsesPanel } from "@/components/modules/varios/anses-panel";

export default async function ConfiguracionVariosPage() {
  await requireAuth();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Varios"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Varios" },
        ]}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AnsesPanel />
        <ImportarClientesPanel />
      </div>
    </div>
  );
}
