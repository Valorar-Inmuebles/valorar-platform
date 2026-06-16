import { requireAuth } from "@/lib/auth/require-auth";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { CasoForm } from "@/components/modules/casos/caso-form";

export default async function CrearCasoPage() {
  await requireAuth();

  return (
    <SettingsContainer className="max-w-6xl">
      <CasoForm mode="create" />
    </SettingsContainer>
  );
}
