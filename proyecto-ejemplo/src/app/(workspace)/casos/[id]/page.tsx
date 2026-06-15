import { requireAuth } from "@/lib/auth/require-auth";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { CasoForm } from "@/components/modules/casos/caso-form";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
};

export default async function CasoDetailPage({ params, searchParams }: Props) {
  await requireAuth();
  const { id } = await params;
  const { edit } = await searchParams;

  return (
    <SettingsContainer className="max-w-6xl">
      <CasoForm mode={edit === "1" ? "edit" : "view"} id={id} />
    </SettingsContainer>
  );
}
