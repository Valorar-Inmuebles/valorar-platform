import { detectStatus } from './status';
import { detectFinancing } from './financing';
import { detectParking } from './parking';
import { detectFeatures } from './features';
import { detectTypologies } from './typologies';
import { composeDescriptions } from './descriptions';
import {
  normalizeEditorialText,
  stripDuplicateConsecutiveSentences,
} from './normalize-text';

describe('status detection', () => {
  it('maps unequivocal completed and pit statuses', () => {
    expect(detectStatus('Edificio Terminado.').status).toBe('COMPLETED');
    expect(detectStatus('LANZAMIENTO EN POZO!!!').status).toBe('IN_PIT');
    expect(detectStatus('Edificio en construcción.').status).toBe(
      'UNDER_CONSTRUCTION',
    );
  });

  it('keeps the text status and warns when a delivery date is already historical', () => {
    const result = detectStatus(
      'Edificio en construcción.\nEntrega estimada Diciembre 2021.',
      new Date('2026-08-21'),
    );
    expect(result.status).toBe('UNDER_CONSTRUCTION');
    expect(
      result.issues.some((issue) => issue.code === 'STALE_DEVELOPMENT_STATUS'),
    ).toBe(true);
  });

  it('does not infer COMPLETED only because a delivery year passed', () => {
    const result = detectStatus(
      'LANZAMIENTO EN POZO!!!\nEntrega estimada Enero / Febrero 2023.',
      new Date('2026-08-21'),
    );
    expect(result.status).toBe('IN_PIT');
  });
});

describe('financing and parking', () => {
  it('extracts financing copy and does not duplicate it later', () => {
    const text =
      'Anticipo, cuotas en pesos y saldo a la posesión.\nUnidades de 1 y 2 ambientes.';
    const result = detectFinancing(text);
    expect(result.hasFinancing).toBe(true);
    expect(result.financingDescription).toContain('Anticipo');
  });

  it('flags weak financing text', () => {
    const result = detectFinancing('Consulte financiación.');
    expect(result.hasFinancing).toBe(true);
    expect(
      result.issues.some((issue) => issue.code === 'WEAK_FINANCING_TEXT'),
    ).toBe(true);
  });

  it('sets parking without inventing a count', () => {
    const result = detectParking('Cocheras cubiertas.');
    expect(result.hasParkingSpaces).toBe(true);
    expect(result.parkingSpacesCount).toBeNull();
    expect(
      result.issues.some(
        (issue) => issue.code === 'GENERIC_PARKING_WITHOUT_COUNT',
      ),
    ).toBe(true);
  });
});

describe('features and typologies', () => {
  it('matches known amenities and keeps unknown ones unmatched', () => {
    const result = detectFeatures(
      'Piscina y SUM. Gimnasio. Parrilla. Ascensor. Portero visor. Split F/C. Calefacción. Apto profesional. Local comercial. Cocheras fijas cubiertas. Laundry. Solarium. Jacuzzi.',
    );
    const slugs = result.matchedFeatures.map((feature) => feature.slug);
    expect(slugs).toEqual(
      expect.arrayContaining([
        'pileta',
        'sum',
        'gimnasio',
        'parrilla',
        'ascensor',
        'portero',
        'aire-acondicionado',
        'calefaccion',
        'apto-profesional',
        'uso-comercial',
        'cochera-cubierta',
        'cochera-fija',
      ]),
    );
    expect(result.unmatchedFeatures.map((item) => item.label)).toEqual(
      expect.arrayContaining(['laundry', 'solarium', 'jacuzzi']),
    );
  });

  it('detects typologies without planning persistence', () => {
    const detected = detectTypologies(
      'Unidades de 1, 2 y 3 ambientes. 2 ambientes en duplex. Penthouse.',
    );
    expect(detected.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        '1 ambiente',
        '2 ambientes',
        '3 ambientes',
        'Dúplex',
        'Penthouse',
      ]),
    );
  });
});

describe('editorial normalization', () => {
  it('fixes broken encoding', () => {
    const result = normalizeEditorialText(
      'Las medidas son aproximadas y a tìtulo orientativo.\nMatrìcula CUCICBA.',
    );
    expect(result.encodingCorrected).toBe(true);
    expect(result.text).toContain('título');
    expect(result.text).toContain('matrícula');
  });

  it('removes an exactly duplicated consecutive sentence', () => {
    const result = stripDuplicateConsecutiveSentences(
      'Todas las unidades al frente con balcón.\nTodas las unidades al frente con balcón.\nHorno y anafe eléctrico.',
    );
    expect(result.removed).toHaveLength(1);
    expect(result.text).toBe(
      'Todas las unidades al frente con balcón.\nHorno y anafe eléctrico.',
    );
  });

  it('composes a short plain-text description without markdown', () => {
    const result = composeDescriptions({
      title: 'Agrelo 4066',
      rawText:
        'Agrelo 4066\nEdificio en construcción.\nBarrio de Almagro.\nUnidades de 1, 2 y 3 ambientes.\nAnticipo, cuotas y saldo a la posesión.\nPiscina y solárium.\nMatrícula CUCICBA N° 3686.',
      financingLines: ['Anticipo, cuotas y saldo a la posesión.'],
    });
    expect(result.shortDescription.length).toBeLessThanOrEqual(200);
    expect(result.shortDescription.includes('Agrelo 4066')).toBe(false);
    expect(result.shortDescription.includes('CUCICBA')).toBe(false);
    expect(result.description.includes('#')).toBe(false);
    expect(result.description.includes('<p>')).toBe(false);
    expect(result.description).not.toContain(
      'Anticipo, cuotas y saldo a la posesión.',
    );
    expect(result.description).toContain('CUCICBA');
  });
});
