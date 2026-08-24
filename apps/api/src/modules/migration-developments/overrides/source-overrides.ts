import type { PlannedDevelopmentStatus } from '../types';

export type SourceOverride = {
  reason: string;
  title?: string;
  status?: PlannedDevelopmentStatus | null;
  statusReason?: string;
  provinceName?: string;
  localityName?: string;
  street?: string;
  streetNumber?: string;
  textReplacements?: Array<{ from: string; to: string; reason: string }>;
  extraFeatureSlugs?: string[];
  excludeFeatureSlugs?: string[];
  excludeFragments?: string[];
};

export const SOURCE_OVERRIDES: Record<string, SourceOverride> = {
  '001': {
    reason: 'Approved construction status for the historical batch.',
    status: 'UNDER_CONSTRUCTION',
  },
  '002': {
    reason: 'TXT uses Ramón Falcón with tildes; the folder name omits them.',
    title: 'Ramón Falcón 1691',
    status: 'UNDER_CONSTRUCTION',
  },
  '003': {
    reason:
      '"Nuevo Flores" is a marketing label, not a catalog locality. Map to Flores.',
    localityName: 'Flores',
    status: 'IN_PIT',
  },
  '004': {
    reason:
      'Locality is not explicit in the TXT; approved as Flores. Keep textual IN_PIT with a stale-status warning.',
    localityName: 'Flores',
    status: 'IN_PIT',
  },
  '005': {
    reason:
      'Locality is not explicit in the TXT; approved as Caballito. Keep textual UNDER_CONSTRUCTION with a stale-status warning.',
    localityName: 'Caballito',
    status: 'UNDER_CONSTRUCTION',
  },
  '006': {
    reason:
      'Locality is not explicit in the TXT; approved as Flores. Keep textual UNDER_CONSTRUCTION with a stale-status warning.',
    localityName: 'Flores',
    status: 'UNDER_CONSTRUCTION',
  },
  '007': {
    reason: 'Broken encoding in tildes (matrìcula, tìtulo, lìnea, melamìnico).',
    status: 'UNDER_CONSTRUCTION',
    textReplacements: [
      { from: 'matrìcula', to: 'matrícula', reason: 'encoding' },
      { from: 'tìtulo', to: 'título', reason: 'encoding' },
      { from: 'lìnea', to: 'línea', reason: 'encoding' },
      { from: 'melamìnico', to: 'melamínico', reason: 'encoding' },
    ],
  },
  '008': {
    reason: 'Locality is not explicit in the TXT; approved as Flores.',
    localityName: 'Flores',
    status: 'COMPLETED',
  },
  '009': {
    reason: 'Locality is not explicit in the TXT; approved as Villa Luro.',
    localityName: 'Villa Luro',
    status: 'COMPLETED',
  },
  '010': {
    reason: 'TXT has no title line; public name comes from the folder.',
    status: 'COMPLETED',
  },
  '011': {
    reason:
      'Source copy has no explicit construction status; approved as COMPLETED.',
    status: 'COMPLETED',
    statusReason:
      'Human review of a commercialized building; TXT never states terminado/pozo/construcción.',
  },
  '012': {
    reason: 'The sentence about units facing the plaza is duplicated.',
    localityName: 'Flores',
    status: 'COMPLETED',
    statusReason:
      'Source text still says "Obra en desarrollo"; the development is commercialized and approved as COMPLETED.',
    excludeFragments: ['Todas las unidades al frente con balcón.'],
  },
  '013': {
    reason:
      'Copy describes a 1½ ambiente PH-like unit, but the folder is part of the development batch and must be imported as Development.',
    localityName: 'Floresta',
    status: 'COMPLETED',
  },
  '014': {
    reason: 'TXT capitalizes Los Incas; the folder uses a lowercase i.',
    title: 'Los Incas 5109',
    localityName: 'Villa Urquiza',
    status: 'COMPLETED',
    statusReason:
      'Commercialized development; TXT has no explicit construction status.',
  },
  '015': {
    reason:
      'Folder omits the tilde in Camacuá; public title and slug must use it.',
    title: 'Camacuá 372',
    status: 'COMPLETED',
    statusReason:
      'Commercialized development; TXT has no explicit construction status.',
  },
  '016': {
    reason:
      'Locality is not explicit in the TXT; approved as Flores. Commercialized development marked COMPLETED.',
    localityName: 'Flores',
    status: 'COMPLETED',
    statusReason:
      'Commercialized development; TXT has no explicit construction status.',
  },
};

export function getSourceOverride(
  sourceId: string,
): SourceOverride | undefined {
  return SOURCE_OVERRIDES[sourceId];
}
