import type { FeatureMatch, UnmatchedFeature } from '../types';

type FeatureRule = {
  slug: string;
  name: string;
  patterns: RegExp[];
};

const MATCHABLE_FEATURES: FeatureRule[] = [
  { slug: 'pileta', name: 'Pileta', patterns: [/\bpiscina\b/i, /\bpileta\b/i] },
  { slug: 'sum', name: 'SUM', patterns: [/\bsum\b/i] },
  { slug: 'gimnasio', name: 'Gimnasio', patterns: [/\bgimnasio\b/i] },
  { slug: 'parrilla', name: 'Parrilla', patterns: [/\bparrillas?\b/i] },
  { slug: 'ascensor', name: 'Ascensor', patterns: [/\bascensor(?:es)?\b/i] },
  {
    slug: 'portero',
    name: 'Portero',
    patterns: [/\bportero(?:\s+(?:visor|el[eé]ctrico))?\b/i],
  },
  {
    slug: 'aire-acondicionado',
    name: 'Aire acondicionado',
    patterns: [/\baire acondicionado\b/i, /\bsplit\b/i],
  },
  {
    slug: 'calefaccion',
    name: 'Calefacción',
    patterns: [/\bcalefacci[oó]n\b/i, /\bradiadores\b/i, /\bcaldera\b/i],
  },
  {
    slug: 'apto-profesional',
    name: 'Apto profesional',
    patterns: [/\bapto profesional\b/i],
  },
  {
    slug: 'uso-comercial',
    name: 'Uso comercial',
    patterns: [
      /\blocal(?:es)?\s+comercial(?:es)?\b/i,
      /\blocal(?:es)?\s+en\s+(?:planta baja|pb)\b/i,
      /\blocal\s+en\s+pb\b/i,
      /\bapto gastron[oó]mico\b/i,
    ],
  },
  {
    slug: 'cochera-cubierta',
    name: 'Cochera cubierta',
    patterns: [
      /\bcocheras?\s+(?:fijas?\s+)?cubiertas?\b/i,
      /\bcocheras? cubiertas?\b/i,
    ],
  },
  {
    slug: 'cochera-fija',
    name: 'Cochera fija',
    patterns: [/\bcocheras?\s+fijas?\b/i],
  },
  {
    slug: 'cochera-planta-baja',
    name: 'Cochera planta baja (PB)',
    patterns: [/\bcocheras?\s+en\s+planta baja\b/i, /\bpb\s+de\s+cocheras\b/i],
  },
  {
    slug: 'cochera-subsuelo',
    name: 'Cochera subsuelo',
    patterns: [
      /\bcocheras?\s+en\s+[^\n.]{0,40}subsuelo\b/i,
      /\bsubsuelo\b[^\n.]{0,40}\bcocheras?\b/i,
    ],
  },
];

const UNMATCHED_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'laundry', pattern: /\blaundry\b/i },
  { label: 'solarium', pattern: /\bsol[aá]rium\b/i },
  { label: 'jacuzzi', pattern: /\bjacuzzi\b/i },
  { label: 'grupo electrógeno', pattern: /\bgrupo electr[oó]geno\b/i },
  { label: 'bauleras', pattern: /\bbauleras?\b/i },
  {
    label: 'tarjeta magnética',
    pattern: /\btarjeta(?:s)?\s+(?:magn[eé]tica|de (?:acceso|proximidad))\b/i,
  },
];

export type FeatureDetection = {
  matchedFeatures: FeatureMatch[];
  unmatchedFeatures: UnmatchedFeature[];
  ambiguousFeatures: UnmatchedFeature[];
};

function firstEvidence(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[0]) {
      return match[0];
    }
  }
  return '';
}

export function detectFeatures(text: string): FeatureDetection {
  const matchedFeatures: FeatureMatch[] = [];

  for (const rule of MATCHABLE_FEATURES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      matchedFeatures.push({
        slug: rule.slug,
        name: rule.name,
        evidence: firstEvidence(text, rule.patterns),
      });
    }
  }

  const unmatchedFeatures: UnmatchedFeature[] = [];
  for (const item of UNMATCHED_PATTERNS) {
    const match = text.match(item.pattern);
    if (match?.[0]) {
      unmatchedFeatures.push({
        label: item.label,
        evidence: match[0],
      });
    }
  }

  return {
    matchedFeatures,
    unmatchedFeatures,
    ambiguousFeatures: [],
  };
}
