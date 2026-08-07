import { parseRoomsFromTitle, transformPublishProperty } from './publish-rules';
import type { WordpressPropertyRaw } from '../types';

function baseRaw(
  over: Partial<WordpressPropertyRaw> = {},
): WordpressPropertyRaw {
  return {
    id: 5312,
    status: 'publish',
    slug: 'jose-marti-1100',
    title: 'Jose Marti 1100',
    content: null,
    postDate: '2018-05-12 10:00:00',
    authorId: '1',
    taxonomies: {
      property_type: ['Lote'],
      property_status: ['En Venta'],
      property_area: ['Flores'],
      property_city: ['Capital Federal'],
      property_feature: ['Pavimento', 'Uso Comercial'],
    },
    meta: {
      fave_property_price: '195000',
      fave_property_price_prefix: 'USD',
      fave_property_land: '202',
      fave_property_land_postfix: 'm²',
      fave_property_bathrooms: '0',
      fave_property_garage: 'NO',
      fave_property_address: 'Jose Marti 1100',
      houzez_geolocation_lat: '-34.6436901',
      houzez_geolocation_long: '-58.4646755',
      fave_property_id: '5312',
    },
    galleryAttachmentIds: [1, 2, 3, 4, 5, 6],
    thumbnailId: 1,
    ...over,
  };
}

describe('publish-wave transform rules', () => {
  it('maps pilot 5312 contract fields', () => {
    const result = transformPublishProperty(baseRaw());
    expect(result.blockers).toEqual([]);
    expect(result.property.propertyType).toBe('LAND');
    expect(result.listing).toEqual({ listingType: 'SALE', status: 'ACTIVE' });
    expect(result.price).toEqual({
      amount: 195000,
      currency: 'USD',
      isPrimary: true,
    });
    expect(result.property.totalArea).toBe(202);
    expect(result.property.coveredArea).toBeNull();
    expect(result.property.rooms).toBeNull();
    expect(result.property.bedrooms).toBeNull();
    expect(result.property.bathrooms).toBeNull();
    expect(result.property.parkingSpaces).toBeNull();
    expect(result.property.latitude).toBeCloseTo(-34.6436901);
  });

  it('treats Miami default coords as absent', () => {
    const result = transformPublishProperty(
      baseRaw({
        meta: {
          ...baseRaw().meta,
          houzez_geolocation_lat: '25.68654',
          houzez_geolocation_long: '-80.431345',
        },
      }),
    );
    expect(result.property.latitude).toBeNull();
    expect(result.property.longitude).toBeNull();
    expect(result.warnings.some((w) => w.code === 'COORDS_MIAMI_DEFAULT')).toBe(
      true,
    );
  });

  it('parses rooms from title and keeps bedrooms separate', () => {
    expect(parseRoomsFromTitle('Semipiso 3 ambientes')).toBe(3);
    expect(parseRoomsFromTitle('MONOAMBIENTE CON RENTA')).toBe(1);
    const meta = { ...baseRaw().meta };
    delete meta.fave_property_land;
    meta.fave_property_bedrooms = '1';
    meta.fave_property_size = '40';
    meta.fave_property_bathrooms = '1';
    const result = transformPublishProperty(
      baseRaw({
        title: 'Depto 2 ambientes. Test',
        taxonomies: {
          property_type: ['Departamento'],
          property_status: ['En Venta'],
          property_area: ['Flores'],
          property_city: ['Capital Federal'],
          property_feature: [],
        },
        meta,
      }),
    );
    expect(result.property.rooms).toBe(2);
    expect(result.property.bedrooms).toBe(1);
    expect(result.property.totalArea).toBe(40);
    expect(result.property.coveredArea).toBeNull();
  });

  it('blocks rent under publish-wave rules', () => {
    const result = transformPublishProperty(
      baseRaw({
        taxonomies: {
          property_type: ['Departamento'],
          property_status: ['En Alquiler'],
          property_city: ['Capital Federal'],
        },
      }),
    );
    expect(result.blockers.some((b) => b.code === 'RENT_OUT_OF_SCOPE')).toBe(
      true,
    );
  });

  it('parses half bathroom strings', () => {
    const meta = { ...baseRaw().meta };
    delete meta.fave_property_land;
    meta.fave_property_bathrooms = '2 y 1/2';
    meta.fave_property_size = '102';
    const result = transformPublishProperty(
      baseRaw({
        taxonomies: {
          property_type: ['Departamento'],
          property_status: ['En Venta'],
          property_city: ['Capital Federal'],
        },
        meta,
      }),
    );
    expect(result.property.bathrooms).toBe(2);
    expect(result.property.halfBathrooms).toBe(1);
  });
});
