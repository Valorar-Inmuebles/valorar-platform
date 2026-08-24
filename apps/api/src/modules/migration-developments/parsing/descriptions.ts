import { SHORT_DESCRIPTION_MAX_CHARS } from '../constants';

const TITLE_LIKE = (title: string) => {
  const normalized = normalizeComparable(title);
  return (line: string) => normalizeComparable(line) === normalized;
};

function normalizeComparable(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[.“”"'\s.!,;:¿?¡-]+/g, ' ')
    .trim();
}

const DISCLAIMER_PATTERN =
  /medidas son aproximadas|im[aá]genes ilustrativas|no contractual|matr[ií]cula cucicba|consulte tambi[eé]n por otros/i;

const STATUS_ONLY_PATTERN =
  /^(edificio\s+)?(en construcci[oó]n|terminado|lanzamiento[^.!]*)[!."”]*$/i;

export function isDisclaimerLine(line: string): boolean {
  return DISCLAIMER_PATTERN.test(line);
}

export function composeDescriptions(input: {
  title: string;
  rawText: string;
  financingLines: string[];
}): { shortDescription: string; description: string } {
  const isTitleLine = TITLE_LIKE(input.title);
  const financingSet = new Set(
    input.financingLines.map((line) => normalizeComparable(line)),
  );

  const sourceLines = input.rawText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !isTitleLine(line));

  const bodyLines = sourceLines.filter(
    (line) => !financingSet.has(normalizeComparable(line)),
  );
  const disclaimerLines = bodyLines.filter(isDisclaimerLine);
  const commercialLines = bodyLines.filter((line) => !isDisclaimerLine(line));

  const shortSource = commercialLines.filter(
    (line) => !STATUS_ONLY_PATTERN.test(line),
  );
  const shortDescription = buildShortDescription(
    shortSource.length > 0 ? shortSource : commercialLines,
  );

  const descriptionBlocks: string[] = [];
  const usedShort = normalizeComparable(shortDescription);

  const remainingCommercial = commercialLines.filter(
    (line) =>
      !usedShort.includes(normalizeComparable(line)) &&
      !STATUS_ONLY_PATTERN.test(line),
  );

  if (remainingCommercial.length > 0) {
    descriptionBlocks.push(remainingCommercial.join('\n\n'));
  } else if (shortDescription) {
    descriptionBlocks.push(shortDescription);
  }

  if (disclaimerLines.length > 0) {
    descriptionBlocks.push(disclaimerLines.join('\n\n'));
  }

  const description = descriptionBlocks.join('\n\n').trim();

  return {
    shortDescription: shortDescription || commercialLines[0] || input.title,
    description: description || shortDescription || input.title,
  };
}

function buildShortDescription(lines: string[]): string {
  const sentences: string[] = [];
  for (const line of lines) {
    const pieces = line
      .split(/(?<=\.)\s+/)
      .map((piece) => piece.trim())
      .filter(Boolean);
    sentences.push(...pieces);
    const joined = sentences.join(' ');
    if (joined.length >= 80 || sentences.length >= 2) {
      break;
    }
  }

  let text = sentences.join(' ').trim();
  if (text.length > SHORT_DESCRIPTION_MAX_CHARS) {
    text = `${text.slice(0, SHORT_DESCRIPTION_MAX_CHARS - 1).trim()}…`;
  }
  return text;
}
