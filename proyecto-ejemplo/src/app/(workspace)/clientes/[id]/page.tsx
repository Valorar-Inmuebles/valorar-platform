import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { ClienteForm } from "@/components/modules/clientes/ClienteForm";
import { clienteService } from "@/lib/server/services/cliente.service";
import { SettingsContainer } from "@/components/layout/SettingsContainer";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function ClienteDetailPage({ params, searchParams }: Props) {
  const ctx = await requireAuth();
  const { id } = await params;
  const { edit } = await searchParams;

  const cliente = await clienteService.getById(ctx, id);

  if (!cliente) notFound();

  const persona = Array.isArray(cliente.persona) ? cliente.persona[0] : cliente.persona;

  if (!persona?.id) notFound();

  return (
    <SettingsContainer>
      <ClienteForm
        mode={edit === "1" ? "edit" : "view"}
        clienteId={id}
        personaId={persona.id}
      />
    </SettingsContainer>
  );
}
