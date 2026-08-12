import { createSearch } from '@repo/geo-text';

/**
 * Explicit Houzez → geo locality allowlist.
 * Only these non-default mappings are permitted; no silent GBA / alias fallback.
 */
export type ExplicitLocalityMapping = {
  /** Human label for reports/warnings. */
  label: string;
  /** Normalized createSearch() keys accepted from Houzez property_area. */
  neighborhoodSearchKeys: readonly string[];
  /**
   * Target province scope:
   * - capital-federal = CABA (barrios as Localities)
   * - buenos-aires = Provincia de Buenos Aires (explicit GBA exception only)
   */
  provinceScope: 'capital-federal' | 'buenos-aires';
  /** Exact Locality.search expected in the geo catalog. */
  localitySearch: string;
};

export const HOUZEZ_EXPLICIT_LOCALITY_MAPPINGS: readonly ExplicitLocalityMapping[] =
  [
    {
      label: 'Parque Avellaneda',
      neighborhoodSearchKeys: ['parqueavellaneda'],
      provinceScope: 'capital-federal',
      localitySearch: 'parqueavellaneda',
    },
    {
      label: 'Ramos Mejía',
      neighborhoodSearchKeys: ['ramosmejia'],
      provinceScope: 'buenos-aires',
      localitySearch: 'ramosmejia',
    },
  ] as const;

export function findExplicitLocalityMapping(
  neighborhoodName: string | null | undefined,
): ExplicitLocalityMapping | null {
  if (!neighborhoodName?.trim()) return null;
  const want = createSearch(neighborhoodName);
  return (
    HOUZEZ_EXPLICIT_LOCALITY_MAPPINGS.find((m) =>
      m.neighborhoodSearchKeys.includes(want),
    ) ?? null
  );
}
