import { CompactCtaBanner } from "@/components/site/compact-cta-banner";
import { VIS_001_HOUSE } from "@/lib/illustrations/vis";
import { HomeCtaBand } from "./home-inline-cta";

export function HomeSearchHelpCta() {
  return (
    <HomeCtaBand className="!pt-0 md:!pt-1">
      <CompactCtaBanner
        illustration={VIS_001_HOUSE}
        title="¿No encontraste la propiedad que buscabas?"
        description="Nuestro equipo puede ayudarte a encontrar opciones que todavía no fueron publicadas o asesorarte durante todo el proceso."
        secondaryAction={{
          href: "/propiedades",
          label: "Ver más propiedades",
        }}
        primaryAction={{
          href: "/contacto",
          label: "Solicitar asesoramiento",
        }}
      />
    </HomeCtaBand>
  );
}
