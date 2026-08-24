import { FOLDER_NAME_PATTERN } from '../constants';

export type ParsedFolderName = {
  ordinal: number;
  sourceId: string;
  publicName: string;
};

export function parseFolderName(folderName: string): ParsedFolderName | null {
  const match = folderName.match(FOLDER_NAME_PATTERN);
  if (!match) {
    return null;
  }

  const sourceId = match[1];
  const publicName = match[2].trim();
  if (!sourceId || !publicName) {
    return null;
  }

  return {
    ordinal: Number.parseInt(sourceId, 10),
    sourceId,
    publicName,
  };
}

export function compareOrdinal(a: number, b: number): number {
  return a - b;
}
