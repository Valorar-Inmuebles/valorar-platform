jest.mock('../../../../generated/prisma/client', () => ({
  PropertyType: { APARTMENT: 'APARTMENT', HOUSE: 'HOUSE' },
  PropertyCondition: {},
  PropertyLayout: {},
  PropertyBrightness: {},
  Orientation: {},
  GeocodeSource: {},
  GeocodeAccuracy: {},
}));

import { PropertyResponseDto } from './property-response.dto';
import type { PropertyWithGeoRelations } from '../utils/property-location';

function baseProperty(
  overrides: Partial<PropertyWithGeoRelations> = {},
): PropertyWithGeoRelations {
  return {
    id: 'prop-1',
    tenantId: 'tenant-1',
    createdById: 'user-1',
    assignedToId: 'user-2',
    slug: 'depto-demo',
    internalCode: null,
    title: 'Depto demo',
    description: null,
    propertyType: 'APARTMENT',
    condition: null,
    isActive: true,
    street: null,
    streetNumber: null,
    floor: null,
    apartment: null,
    neighborhood: null,
    city: 'CABA',
    province: null,
    country: 'AR',
    countryId: null,
    provinceId: null,
    localityId: null,
    neighborhoodId: null,
    postalCode: null,
    latitude: null,
    longitude: null,
    googlePlaceId: null,
    formattedAddress: null,
    geocodeSource: null,
    geocodeAccuracy: null,
    totalArea: null,
    coveredArea: null,
    uncoveredArea: null,
    lotFront: null,
    lotDepth: null,
    rooms: null,
    bedrooms: null,
    bathrooms: null,
    halfBathrooms: null,
    parkingSpaces: null,
    yearBuilt: null,
    orientation: null,
    layout: null,
    brightness: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-02T00:00:00.000Z'),
    ...overrides,
  } as PropertyWithGeoRelations;
}

describe('PropertyResponseDto.fromEntity createdBy', () => {
  it('maps active creator with name', () => {
    const dto = PropertyResponseDto.fromEntity(
      baseProperty({
        createdBy: {
          id: 'user-1',
          name: 'Ana Admin',
          email: 'ana@demo.valorar.dev',
          isActive: true,
        },
      }),
    );

    expect(dto.createdById).toBe('user-1');
    expect(dto.assignedToId).toBe('user-2');
    expect(dto.createdBy).toEqual({
      id: 'user-1',
      name: 'Ana Admin',
      email: 'ana@demo.valorar.dev',
      isActive: true,
    });
  });

  it('maps inactive creator without changing createdById', () => {
    const dto = PropertyResponseDto.fromEntity(
      baseProperty({
        createdBy: {
          id: 'user-1',
          name: 'Ana Admin',
          email: 'ana@demo.valorar.dev',
          isActive: false,
        },
      }),
    );

    expect(dto.createdById).toBe('user-1');
    expect(dto.createdBy?.isActive).toBe(false);
    expect(dto.createdBy?.name).toBe('Ana Admin');
  });

  it('keeps email available for name fallback in clients', () => {
    const dto = PropertyResponseDto.fromEntity(
      baseProperty({
        createdBy: {
          id: 'user-1',
          name: '   ',
          email: 'fallback@demo.valorar.dev',
          isActive: true,
        },
      }),
    );

    expect(dto.createdBy?.name.trim()).toBe('');
    expect(dto.createdBy?.email).toBe('fallback@demo.valorar.dev');
  });

  it('returns null createdBy when relation was not loaded', () => {
    const dto = PropertyResponseDto.fromEntity(baseProperty());
    expect(dto.createdBy).toBeNull();
    expect(dto.createdById).toBe('user-1');
  });

  it('does not confuse creator with assignee', () => {
    const dto = PropertyResponseDto.fromEntity(
      baseProperty({
        createdById: 'creator-id',
        assignedToId: 'assignee-id',
        createdBy: {
          id: 'creator-id',
          name: 'Creador',
          email: 'creator@demo.valorar.dev',
          isActive: true,
        },
      }),
    );

    expect(dto.createdBy?.id).toBe('creator-id');
    expect(dto.assignedToId).toBe('assignee-id');
    expect(dto.createdBy?.id).not.toBe(dto.assignedToId);
  });
});
