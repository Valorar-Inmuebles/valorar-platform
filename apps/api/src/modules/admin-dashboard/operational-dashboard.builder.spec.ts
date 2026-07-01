import { buildOperationalDashboard } from './operational-dashboard.builder';

describe('buildOperationalDashboard', () => {
  const now = new Date('2026-07-01T12:00:00.000Z');

  it('counts KPIs and attention filters for active properties', () => {
    const result = buildOperationalDashboard({
      now,
      properties: [
        {
          id: 'prop-1',
          title: 'Publicada OK',
          description: 'Descripción suficientemente larga para SEO y publicación.',
          isActive: true,
          createdAt: new Date('2026-06-01T10:00:00.000Z'),
          updatedAt: new Date('2026-06-01T10:00:00.000Z'),
          createdBy: { id: 'user-1', name: 'Ana' },
        } as never,
        {
          id: 'prop-2',
          title: 'Borrador',
          description: null,
          isActive: true,
          createdAt: new Date('2026-06-02T10:00:00.000Z'),
          updatedAt: new Date('2026-06-02T10:00:00.000Z'),
          createdBy: { id: 'user-1', name: 'Ana' },
        } as never,
        {
          id: 'prop-3',
          title: 'Archivada',
          description: 'Descripción suficientemente larga para SEO y publicación.',
          isActive: false,
          createdAt: new Date('2026-05-01T10:00:00.000Z'),
          updatedAt: new Date('2026-06-28T10:00:00.000Z'),
          createdBy: { id: 'user-1', name: 'Ana' },
        } as never,
      ],
      listings: [
        {
          id: 'listing-1',
          propertyId: 'prop-1',
          listingType: 'SALE',
          status: 'ACTIVE',
          publishedAt: new Date('2026-06-20T10:00:00.000Z'),
          createdAt: new Date('2026-06-10T10:00:00.000Z'),
          updatedAt: new Date('2026-06-20T10:00:00.000Z'),
        } as never,
      ],
      imageStats: new Map([
        ['prop-1', { imageCount: 1, hasCoverImage: true }],
        ['prop-2', { imageCount: 0, hasCoverImage: false }],
      ]),
      images: [],
      featureCounts: new Map([
        ['prop-1', 1],
        ['prop-2', 0],
      ]),
      primaryPriceListingIds: new Set(['listing-1']),
    });

    expect(result.kpis).toEqual({
      totalProperties: 3,
      published: 1,
      drafts: 1,
      archived: 1,
    });
    expect(result.filterSets.withoutImages).toEqual(['prop-2']);
    expect(result.filterSets.withoutCommercialization).toEqual(['prop-2']);
    expect(result.filterSets.withoutDescription).toEqual(['prop-2']);
    expect(result.filterSets.withoutFeatures).toEqual(['prop-2']);
    expect(result.filterSets.recentlyArchived).toEqual(['prop-3']);
  });
});
