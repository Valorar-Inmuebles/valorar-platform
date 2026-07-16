import { EditorialIllustrationBanner } from "@/components/site/editorial-illustration-banner";
import { VIS_001_HOUSE } from "@/lib/illustrations/vis";
import { HomeCtaBand } from "./home-inline-cta";

export function HomeNextStepCta() {
  return (
    <HomeCtaBand className="!pt-4 md:!pt-5">
      <EditorialIllustrationBanner
        illustration={VIS_001_HOUSE}
        title="¿Listo para encontrar tu próximo hogar?"
        description="Ya sea para comprar, vender, alquilar o invertir en un emprendimiento, nuestro equipo puede acompañarte durante todo el proceso."
        primaryAction={{
          href: "/contacto",
          label: "Contactanos",
        }}
        secondaryAction={{
          href: "/servicios",
          label: "Conocer nuestros servicios",
        }}
      />
    </HomeCtaBand>
  );
}
