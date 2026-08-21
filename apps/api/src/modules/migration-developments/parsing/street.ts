export type StreetParse = {
  street: string | null;
  streetNumber: string | null;
};

export function parseStreetFromTitle(title: string): StreetParse {
  const match = title.trim().match(/^(.*?)[\s,]+(\d+[A-Za-z]?)$/);
  if (!match) {
    return { street: null, streetNumber: null };
  }

  return {
    street: match[1].trim(),
    streetNumber: match[2],
  };
}
