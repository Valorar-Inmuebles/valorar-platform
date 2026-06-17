import type { PublicationCheckKey } from './types';

const CHECK_LABELS: Record<PublicationCheckKey, string> = {
  'property-active': 'Propiedad activa',
  'has-image': 'Al menos una imagen',
  'cover-image': 'Imagen portada definida',
  'listing-active': 'Publicación activa',
  'primary-price': 'Precio principal definido',
};

const CHECK_MESSAGES: Partial<Record<PublicationCheckKey, string>> = {
  'property-active': 'Activá la propiedad',
  'has-image': 'Agregá al menos una imagen',
  'cover-image': 'Definí una imagen portada',
  'listing-active': 'Activá la publicación',
  'primary-price': 'Definí un precio principal',
};

export function getPublicationCheckLabel(key: PublicationCheckKey): string {
  return CHECK_LABELS[key];
}

export function getPublicationCheckMessage(
  key: PublicationCheckKey,
): string | undefined {
  return CHECK_MESSAGES[key];
}
