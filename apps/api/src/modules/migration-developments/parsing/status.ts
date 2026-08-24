import type { PlannedDevelopmentStatus, SourceIssue } from '../types';

const COMPLETED_PATTERN =
  /edificio\s+terminado|\bterminado!+|\ba\s+estrenar\b/i;
const IN_PIT_PATTERN =
  /lanzamiento[^\n.]{0,40}pozo|\ben\s+pozo\b|\bde\s+pozo\b/i;
const UNDER_CONSTRUCTION_PATTERN =
  /en\s+construcci[oó]n|obra\s+en\s+desarrollo/i;

const MONTHS: Record<string, number> = {
  enero: 1,
  febrero: 2,
  marzo: 3,
  abril: 4,
  mayo: 5,
  junio: 6,
  julio: 7,
  agosto: 8,
  septiembre: 9,
  octubre: 10,
  noviembre: 11,
  diciembre: 12,
};

export type StatusDetection = {
  status: PlannedDevelopmentStatus | null;
  evidence: string | null;
  deliveryYear: number | null;
  issues: SourceIssue[];
};

function extractDeliveryYear(text: string): number | null {
  const yearMatch = text.match(
    /(?:entrega(?:\s+estimada)?|a[nñ]o\s+de\s+entrega)\s*[:.]?\s*[^\d]{0,30}(20\d{2})/i,
  );
  if (yearMatch) {
    return Number.parseInt(yearMatch[1], 10);
  }
  return null;
}

export function detectStatus(text: string, now = new Date()): StatusDetection {
  const issues: SourceIssue[] = [];
  let status: PlannedDevelopmentStatus | null = null;
  let evidence: string | null = null;

  if (COMPLETED_PATTERN.test(text)) {
    status = 'COMPLETED';
    evidence = text.match(COMPLETED_PATTERN)?.[0] ?? 'terminado';
  } else if (IN_PIT_PATTERN.test(text)) {
    status = 'IN_PIT';
    evidence = text.match(IN_PIT_PATTERN)?.[0] ?? 'pozo';
  } else if (UNDER_CONSTRUCTION_PATTERN.test(text)) {
    status = 'UNDER_CONSTRUCTION';
    evidence = text.match(UNDER_CONSTRUCTION_PATTERN)?.[0] ?? 'construcción';
  }

  const deliveryYear = extractDeliveryYear(text);
  const currentYear = now.getFullYear();

  if (
    deliveryYear != null &&
    deliveryYear < currentYear &&
    (status === 'IN_PIT' || status === 'UNDER_CONSTRUCTION')
  ) {
    issues.push({
      code: 'STALE_DEVELOPMENT_STATUS',
      severity: 'warning',
      blocking: false,
      message: `Text status ${status} coexists with a historical delivery year (${deliveryYear}). The explicit text status is preserved.`,
    });
  }

  if (!status) {
    issues.push({
      code: 'UNKNOWN_DEVELOPMENT_STATUS',
      severity: 'warning',
      blocking: false,
      message: 'No reliable construction status was found in the source text.',
    });
  }

  return { status, evidence, deliveryYear, issues };
}

export function monthIndex(name: string): number | undefined {
  return MONTHS[name.toLowerCase()];
}
