import type { PublicPropertyFeature } from "@repo/shared-types";
import {
  FEATURE_CATEGORY_ORDER,
  getFeatureCategoryLabel,
} from "@/lib/format/labels";

type PropertyFeaturesProps = {
  features: PublicPropertyFeature[];
};

function groupFeaturesByCategory(features: PublicPropertyFeature[]) {
  return FEATURE_CATEGORY_ORDER.map((category) => ({
    category,
    label: getFeatureCategoryLabel(category),
    items: features.filter((feature) => feature.category === category),
  })).filter((group) => group.items.length > 0);
}

export function PropertyFeatures({ features }: PropertyFeaturesProps) {
  const groups = groupFeaturesByCategory(features);

  if (groups.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">
        Características
      </h2>

      <div className="mt-6 space-y-8">
        {groups.map((group) => (
          <div key={group.category}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              {group.label}
            </h3>
            <ul className="mt-3 flex flex-wrap gap-2">
              {group.items.map((feature) => (
                <li
                  key={feature.id}
                  className="inline-flex items-center rounded-full border border-border bg-slate-50 px-3 py-1.5 text-sm text-foreground"
                >
                  {feature.name}
                  {feature.value ? (
                    <span className="ml-1 text-muted">· {feature.value}</span>
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
