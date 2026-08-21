import type { DetectedTypology } from '../types';

const TYPOLOGY_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: 'Monoambiente', pattern: /\bmonoambientes?\b/i },
  {
    name: '1 ½ ambientes',
    pattern: /\b1\s*½\s*amb|\b1\s*1\/2\s*amb|\b1\s+1\/2\s+amb/i,
  },
  { name: '2 ½ ambientes', pattern: /\b2\s*½\s*amb|\b2\s*1\/2\s*amb/i },
  { name: '1 ambiente', pattern: /\b1\s+ambientes?\b|\bunidades de 1\b/i },
  { name: '2 ambientes', pattern: /\b2\s+ambientes?\b|\b2\s+amb\b/i },
  { name: '3 ambientes', pattern: /\b3\s+ambientes?\b|\b3\s+amb\b/i },
  { name: '4 ambientes', pattern: /\b4\s+ambientes?\b|\b4\s+amb\b/i },
  { name: 'Dúplex', pattern: /\bd[uú]plex\b/i },
  { name: 'Penthouse', pattern: /\bpenthouse\b/i },
  {
    name: 'Estudio apto profesional',
    pattern: /\bestudios?\s+apto profesional\b/i,
  },
  {
    name: 'Local comercial',
    pattern: /\blocal(?:es)?(?:\s+comercial(?:es)?)?\b/i,
  },
];

export function detectTypologies(text: string): DetectedTypology[] {
  const detected: DetectedTypology[] = [];

  for (const rule of TYPOLOGY_PATTERNS) {
    const match = text.match(rule.pattern);
    if (match?.[0]) {
      detected.push({
        name: rule.name,
        evidence: match[0],
      });
    }
  }

  return detected;
}
