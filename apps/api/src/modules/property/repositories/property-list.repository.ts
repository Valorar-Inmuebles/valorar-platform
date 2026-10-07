import { Injectable } from '@nestjs/common';
import type {
  PropertyListItem,
  PropertyListResponse,
} from '@repo/shared-types';
import {
  Prisma,
  type PropertyListingType,
} from '../../../../generated/prisma/client';
import { PropertyListQueryDto } from '../dto/property-list-query.dto';
import {
  creatorJoinSql,
  geoJoinSql,
  jsTrimSql,
  listingEligibleSql,
  localitySql,
  neighborhoodSql,
  propertyListFiltersSql,
  propertyListOrderSql,
  publishableSql,
} from './property-list.sql';

export type PropertyListRow = Omit<
  PropertyListItem,
  'capabilities' | 'publicUrl'
> & {
  createdById: string;
  assignedToId: string | null;
  publicListingType: PropertyListingType | null;
  shared: { canView: boolean; canEdit: boolean } | null;
};
type ReadResult = Omit<PropertyListResponse, 'items'> & {
  items: PropertyListRow[];
};

@Injectable()
export class PropertyListRepository {
  async read(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    authorizedWhere: Prisma.Sql,
    query: PropertyListQueryDto,
    now: Date,
  ): Promise<ReadResult> {
    const order = propertyListOrderSql(query);
    const [result] = await tx.$queryRaw<ReadResult[]>(Prisma.sql`
      WITH universe AS MATERIALIZED (
        SELECT p.id, p."isActive", ${publishableSql} AS published
        FROM "Property" p WHERE ${authorizedWhere}
      ), counts AS (
        SELECT jsonb_build_object(
          'all', count(*), 'active', count(*) FILTER (WHERE "isActive"),
          'published', count(*) FILTER (WHERE published),
          'commercialDraft', count(*) FILTER (WHERE "isActive" AND NOT published),
          'archived', count(*) FILTER (WHERE NOT "isActive")
        ) AS "commercialCounts" FROM universe
      ), filtered AS MATERIALIZED (
        SELECT p.id, p."updatedAt", p.title, p."propertyType", u."isActive", u.published,
          ${localitySql} AS locality, ${neighborhoodSql} AS neighborhood,
          COALESCE(NULLIF(${jsTrimSql(Prisma.sql`creator.name`)}, ''), NULLIF(${jsTrimSql(Prisma.sql`creator.email`)}, '')) AS creator_sort
        FROM universe u JOIN "Property" p ON p.id = u.id AND p."tenantId" = ${tenantId}
        ${geoJoinSql} ${creatorJoinSql}
        WHERE ${propertyListFiltersSql(query, now)}
      ), totals AS (
        SELECT count(*)::int AS total, ceil(count(*)::numeric / ${query.pageSize})::int AS "totalPages" FROM filtered
      ), bounds AS (
        SELECT *, greatest(1, least(${query.page}, "totalPages"))::int AS page FROM totals
      ), page_rows AS MATERIALIZED (
        SELECT f.*, row_number() OVER (ORDER BY ${order}) AS ordinal FROM filtered f
        ORDER BY ${order} LIMIT ${query.pageSize}
        OFFSET (SELECT (page - 1)::bigint * ${query.pageSize} FROM bounds)
      )
      SELECT bounds.*, ${query.pageSize}::int AS "pageSize", counts."commercialCounts",
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'id', p.id, 'slug', p.slug, 'title', p.title, 'internalCode', p."internalCode",
          'propertyType', p."propertyType", 'isActive', p."isActive",
          'location', jsonb_build_object('localityName', pg.locality, 'neighborhoodName', pg.neighborhood),
          'listingTypes', operations.types, 'activeListingsCount', operations.active_count,
          'statusVariant', CASE WHEN NOT pg."isActive" THEN 'archived' WHEN pg.published THEN 'published' ELSE 'commercial-draft' END,
          'isAnyPublishable', pg.published,
          'publicListingType', CASE WHEN pg.published THEN (SELECT l."listingType" FROM "PropertyListing" l
            WHERE l."propertyId" = p.id AND l."tenantId" = ${tenantId} AND ${listingEligibleSql}
            ORDER BY l."updatedAt" DESC, l.id COLLATE "C" ASC LIMIT 1) ELSE NULL END,
          'createdBy', CASE WHEN creator.id IS NULL THEN NULL ELSE jsonb_build_object('id', creator.id, 'name', creator.name, 'email', creator.email, 'isActive', creator."isActive") END,
          'createdById', p."createdById", 'assignedToId', p."assignedToId",
          'shared', CASE WHEN access.id IS NULL THEN NULL ELSE jsonb_build_object('canView', access."canView", 'canEdit', access."canEdit") END
        ) ORDER BY pg.ordinal)
        FROM page_rows pg JOIN "Property" p ON p.id = pg.id AND p."tenantId" = ${tenantId}
        ${creatorJoinSql}
        LEFT JOIN "PropertyAgentAccess" access ON access."propertyId" = p.id AND access."tenantId" = ${tenantId} AND access."userId" = ${userId}
        CROSS JOIN LATERAL (
          SELECT COALESCE(jsonb_agg(l."listingType" ORDER BY l."listingType"), '[]'::jsonb) AS types,
            count(*) FILTER (WHERE l.status = 'ACTIVE') AS active_count
          FROM "PropertyListing" l WHERE l."propertyId" = p.id AND l."tenantId" = ${tenantId}
        ) operations), '[]'::jsonb) AS items
      FROM bounds CROSS JOIN counts
    `);
    if (!result) throw new Error('Property list aggregate returned no result');
    return result;
  }
}
