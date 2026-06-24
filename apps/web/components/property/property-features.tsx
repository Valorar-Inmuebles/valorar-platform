import type { PublicPropertyFeature } from "@repo/shared-types";
import {
  FEATURE_CATEGORY_ORDER,
  getFeatureCategoryLabel,
} from "@/lib/format/labels";

type PropertyFeaturesProps = {
  features: PublicPropertyFeature[];
  showHeading?: boolean;
};

function groupFeaturesByCategory(features: PublicPropertyFeature[]) {
  return FEATURE_CATEGORY_ORDER.map((category) => ({
    category,
    label: getFeatureCategoryLabel(category),
    items: features.filter((feature) => feature.category === category),
  })).filter((group) => group.items.length > 0);
}

export function PropertyFeatures({
  features,
  showHeading = true,
}: PropertyFeaturesProps) {
  const groups = groupFeaturesByCategory(features);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className={showHeading ? "mt-12" : "mt-8"}>
      {showHeading ? (
        <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
          Comodidades y servicios
        </h2>
      ) : null}

      <div className={showHeading ? "mt-6 space-y-8" : "space-y-8"}>
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
              {group.label}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.items.map((feature) => (
                <li
                  key={feature.id}
                  className="inline-flex items-center rounded-full border border-border-default bg-surface-card px-3 py-1.5 text-sm text-text-primary"
                >
                  {feature.name}
                  {feature.value ? (
                    <span className="ml-1 text-text-secondary">
                      · {feature.value}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
