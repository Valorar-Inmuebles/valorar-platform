import type { SourceIssue } from '../types';

const FINANCING_LINE_PATTERN =
  /anticipo|cuotas|saldo a la posesi[oó]n|consulte financiaci[oó]n|consultar financiaci[oó]n|financiaci[oó]n/i;

export type FinancingDetection = {
  hasFinancing: boolean;
  financingDescription: string | null;
  sourceLines: string[];
  issues: SourceIssue[];
};

export function detectFinancing(text: string): FinancingDetection {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const sourceLines = lines.filter((line) => FINANCING_LINE_PATTERN.test(line));

  if (sourceLines.length === 0) {
    return {
      hasFinancing: false,
      financingDescription: null,
      sourceLines: [],
      issues: [],
    };
  }

  const financingDescription = sourceLines.join('\n');
  const hasConcreteTerms = /anticipo|cuotas|saldo/i.test(financingDescription);
  const issues: SourceIssue[] = [];

  if (!hasConcreteTerms) {
    issues.push({
      code: 'WEAK_FINANCING_TEXT',
      severity: 'warning',
      blocking: false,
      message:
        'Financing is mentioned without concrete terms (anticipo/cuotas/saldo).',
    });
  }

  return {
    hasFinancing: true,
    financingDescription,
    sourceLines,
    issues,
  };
}
