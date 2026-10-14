jest.mock('../../../../generated/prisma/client', () => ({
  Prisma: {
    PrismaClientKnownRequestError: class extends Error {
      code: string;
      meta: Record<string, unknown>;
      constructor(
        message: string,
        options: { code: string; meta: Record<string, unknown> },
      ) {
        super(message);
        this.code = options.code;
        this.meta = options.meta;
      }
    },
  },
}));
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));
import { Prisma } from '../../../../generated/prisma/client';
import {
  PropertyRepository,
  type CreatePropertyData,
} from './property.repository';

const data: CreatePropertyData = {
  tenantId: 'a',
  createdById: 'u',
  title: 'Casa',
  slug: 'casa',
  propertyType: 'HOUSE',
  city: 'Rosario',
};
const conflict = (target: string[] = ['tenantId', 'slug']) =>
  new Prisma.PrismaClientKnownRequestError('duplicate', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
  });

describe('generated slug reservation', () => {
  it('selects a free suffix among many collisions, only in the requested tenant', async () => {
    const findMany = jest
      .fn()
      .mockResolvedValue([
        { slug: 'casa' },
        ...Array.from({ length: 100 }, (_, i) => ({ slug: `casa-${i + 2}` })),
      ]);
    const create = jest
      .fn()
      .mockImplementation(({ data }: { data: CreatePropertyData }) =>
        Promise.resolve(data),
      );
    const repository = new PropertyRepository({
      property: { findMany, create },
    } as never);
    const result = await repository.createWithGeneratedSlug(data);
    expect(result.slug).toBe('casa-102');
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'a', slug: { startsWith: 'casa' } },
      select: { slug: true },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('retries DB unique violations under concurrent identical creates without changing unrelated data', async () => {
    const rows = new Map<string, CreatePropertyData>();
    const findMany = jest.fn().mockResolvedValue([]); // All contenders read the same empty snapshot.
    const create = jest.fn(async ({ data }: { data: CreatePropertyData }) => {
      await Promise.resolve();
      const key = `${data.tenantId}/${data.slug}`;
      if (rows.has(key)) throw conflict();
      rows.set(key, data);
      return data;
    });
    const repository = new PropertyRepository({
      property: { findMany, create },
    } as never);
    const results = await Promise.all([
      repository.createWithGeneratedSlug(data),
      repository.createWithGeneratedSlug(data),
      repository.createWithGeneratedSlug(data),
    ]);
    expect(results.map((row) => row.slug).sort()).toEqual([
      'casa',
      'casa-2',
      'casa-3',
    ]);
    expect(
      results.every((row) => row.tenantId === 'a' && row.createdById === 'u'),
    ).toBe(true);
    expect(
      (await repository.createWithGeneratedSlug({ ...data, tenantId: 'b' }))
        .slug,
    ).toBe('casa');
  });
  it.each([
    conflict(['tenantId', 'internalCode']),
    new Error('connection lost'),
  ])('does not retry another constraint or uncertain write', async (error) => {
    const create = jest.fn().mockRejectedValue(error);
    const repository = new PropertyRepository({
      property: { findMany: jest.fn().mockResolvedValue([]), create },
    } as never);
    await expect(repository.createWithGeneratedSlug(data)).rejects.toBe(error);
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('bounds contention retries and keeps the explicit-slug create path unchanged', async () => {
    const create = jest.fn().mockRejectedValue(conflict());
    const repository = new PropertyRepository({
      property: { findMany: jest.fn().mockResolvedValue([]), create },
    } as never);
    await expect(repository.createWithGeneratedSlug(data)).rejects.toThrow(
      'Volvé a intentar',
    );
    expect(create).toHaveBeenCalledTimes(20);
    create.mockClear();
    await expect(repository.create(data)).rejects.toThrow('duplicate');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
