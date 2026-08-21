const BROKEN_ENCODING_REPLACEMENTS: Array<{ from: RegExp; to: string }> = [
  { from: /matr[ìi]cula/gi, to: 'matrícula' },
  { from: /t[ìi]tulo/gi, to: 'título' },
  { from: /l[ìi]nea/gi, to: 'línea' },
  { from: /melam[ìi]nico/gi, to: 'melamínico' },
  { from: /constru[ií]do/gi, to: 'construido' },
  { from: /porcellanato/gi, to: 'porcelanato' },
  { from: /divisbles/gi, to: 'divisibles' },
  { from: /gastronómicosó/gi, to: 'gastronómicos, ' },
];

export function collapseWhitespace(value: string): string {
  return value
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .trim();
}

export function normalizeEditorialText(value: string): {
  text: string;
  encodingCorrected: boolean;
} {
  let text = value.normalize('NFC').replace(/\r\n/g, '\n');
  let encodingCorrected = false;

  for (const replacement of BROKEN_ENCODING_REPLACEMENTS) {
    const next = text.replace(replacement.from, replacement.to);
    if (next !== text) {
      encodingCorrected = true;
      text = next;
    }
  }

  text = text
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { text, encodingCorrected };
}

export function stripDuplicateConsecutiveSentences(value: string): {
  text: string;
  removed: string[];
} {
  const lines = value.split('\n');
  const result: string[] = [];
  const removed: string[] = [];
  let previous = '';

  for (const line of lines) {
    const normalized = line.trim().toLowerCase();
    if (normalized && normalized === previous) {
      removed.push(line.trim());
      continue;
    }
    result.push(line);
    previous = normalized;
  }

  return {
    text: result
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    removed,
  };
}

export function slugifyTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
