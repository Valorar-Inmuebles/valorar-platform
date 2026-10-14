jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ValidationPipe } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { realdataAllowsRequest } from '../../../common/safety/realdata-safety';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import {
  PERMISSIONS_KEY,
  PERMISSIONS_MODE_KEY,
} from '../../../common/decorators/require-permissions.decorator';
import { PropertyLocationSearchDto } from '../dto/property-location-search.dto';
import { PropertyLocationSearchController } from './property-location-search.controller';

describe('geocoding HTTP boundary', () => {
  it('retains JWT, effective tenant and permission guards', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PropertyLocationSearchController),
    ).toEqual([JwtAuthGuard, TenantGuard, PermissionsGuard]);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        Reflect.get(
          PropertyLocationSearchController.prototype,
          'create',
        ) as object,
      ),
    ).toEqual(['property.create']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_KEY,
        Reflect.get(
          PropertyLocationSearchController.prototype,
          'edit',
        ) as object,
      ),
    ).toEqual(['property.update.own', 'property.update.any']);
    expect(
      Reflect.getMetadata(
        PERMISSIONS_MODE_KEY,
        Reflect.get(
          PropertyLocationSearchController.prototype,
          'edit',
        ) as object,
      ),
    ).toBe('any');
  });
  it('refuses extra private fields, invalid country, empty street and long inputs', async () => {
    const base = {
      street: 'Santa Fe',
      city: 'Rosario',
      province: 'Santa Fe',
      country: 'AR',
    };
    for (const input of [
      { ...base, street: '' },
      { ...base, country: 'UY' },
      { ...base, street: 'a'.repeat(121) },
    ]) {
      const errors = await validate(
        plainToInstance(PropertyLocationSearchDto, input),
      );
      expect(errors.length).toBeGreaterThan(0);
    }
    expect(
      await validate(plainToInstance(PropertyLocationSearchDto, base)),
    ).toEqual([]);
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    await expect(
      pipe.transform(
        { ...base, tenantId: 'other', owner: 'secret' },
        { type: 'body', metatype: PropertyLocationSearchDto },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });
  it('preserves RealData read-only HTTP predicate', () => {
    expect(realdataAllowsRequest('POST', '/properties/location-search')).toBe(
      false,
    );
    expect(
      realdataAllowsRequest('POST', '/properties/id/location-search'),
    ).toBe(false);
  });
});
