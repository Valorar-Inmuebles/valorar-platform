import type { PublicDevelopmentTypology } from "@repo/shared-types";
import { PropertyDetailSection } from "@/components/property/property-detail-section";
import { buildTypologyDisplayItems } from "@/lib/development/typology-display";

type DevelopmentTypologiesSectionProps = {
  typologies: PublicDevelopmentTypology[];
};

export function DevelopmentTypologiesSection({
  typologies,
}: DevelopmentTypologiesSectionProps) {
  if (typologies.length === 0) {
    return null;
  }

  return (
    <PropertyDetailSection title="Tipologías">
      <div className="divide-y divide-border-default rounded-2xl ring-1 ring-border-default">
        {typologies.map((typology) => {
          const displayItems = buildTypologyDisplayItems(typology);

          return (
            <div key={typology.id} className="space-y-4 p-4 md:p-5">
              <div className="space-y-2">
                <h3 className="text-base font-medium text-text-primary">
                  {typology.name}
                </h3>
                {typology.description ? (
                  <p className="text-sm text-text-secondary">
                    {typology.description}
                  </p>
                ) : null}
              </div>

              {displayItems.length > 0 ? (
                <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                  {displayItems.map((item) => (
                    <div key={item.key}>
                      <dt className="text-sm text-text-secondary">
                        {item.label}
                      </dt>
                      <dd className="text-sm font-medium text-text-primary">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          );
        })}
      </div>
    </PropertyDetailSection>
  );
}
