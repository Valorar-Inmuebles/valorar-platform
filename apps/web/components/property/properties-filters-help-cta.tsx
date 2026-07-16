import { CompactCtaBanner } from "@/components/site/compact-cta-banner";
import { VIS_001_HOUSE } from "@/lib/illustrations/vis";

/** Compact VIS CTA placed below the Propiedades filters panel. */
export function PropertiesFiltersHelpCta() {
  return (
    <CompactCtaBanner
      layout="stack"
      illustration={VIS_001_HOUSE}
      title="¿No encontrás la propiedad que buscás?"
      description="Te ayudamos a encontrarla."
      primaryAction={{
        href: "/contacto",
        label: "Contactanos",
        variant: "outline",
      }}
    />
  );
}
