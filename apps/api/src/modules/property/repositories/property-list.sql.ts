import { Prisma } from '../../../../generated/prisma/client';
import {
  PROPERTY_DESCRIPTION_MIN_LENGTH,
  propertyRecentlyArchivedThreshold,
} from '@repo/property-rules';
import { PropertyListQueryDto } from '../dto/property-list-query.dto';

// ECMAScript WhiteSpace + LineTerminator, deliberately not PostgreSQL's trim default.
const JS_WHITESPACE =
  '\u0009\u000a\u000b\u000c\u000d\u0020\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a\u2028\u2029\u202f\u205f\u3000\ufeff';
export const jsTrimSql = (text: Prisma.Sql) =>
  Prisma.sql`btrim(${text}, ${JS_WHITESPACE})`;
// ICU root lower preserves Unicode casing (including contextual sigma and dotted I).
// C collation is applied separately for deterministic sorting, not case conversion.
export const lowerSql = (text: Prisma.Sql) =>
  Prisma.sql`lower((${text}) COLLATE "und-x-icu")`;
export const localitySql = Prisma.sql`COALESCE(loc.name, p.city)`;
export const neighborhoodSql = Prisma.sql`COALESCE(n.name, p.neighborhood)`;
export const creatorJoinSql = Prisma.sql`LEFT JOIN "User" creator ON creator.id = p."createdById"
  AND (creator."tenantId" = p."tenantId" OR (creator."tenantId" IS NULL AND creator.role = 'SUPER_ADMIN'))`;
export const geoJoinSql = Prisma.sql`LEFT JOIN "Locality" loc ON loc.id = p."localityId"
  LEFT JOIN "Neighborhood" n ON n.id = p."neighborhoodId"`;

export const listingEligibleSql = Prisma.sql`(l.status IN ('RESERVED', 'CLOSED') OR
  (l.status = 'ACTIVE' AND EXISTS (SELECT 1 FROM "PropertyPrice" price
    WHERE price."listingId" = l.id AND price."tenantId" = p."tenantId" AND price."isPrimary")))`;

export const publishableSql = Prisma.sql`(p."isActive" AND
  EXISTS (SELECT 1 FROM "PropertyImage" image WHERE image."propertyId" = p.id
    AND image."tenantId" = p."tenantId" AND image."isCover") AND
  EXISTS (SELECT 1 FROM "PropertyListing" l WHERE l."propertyId" = p.id
    AND l."tenantId" = p."tenantId" AND ${listingEligibleSql}))`;

export function propertyListFiltersSql(
  query: PropertyListQueryDto,
  now: Date,
): Prisma.Sql {
  const clauses: Prisma.Sql[] = [];
  const status = {
    all: Prisma.sql`TRUE`,
    active: Prisma.sql`u."isActive"`,
    published: Prisma.sql`u.published`,
    'commercial-draft': Prisma.sql`u."isActive" AND NOT u.published`,
    archived: Prisma.sql`NOT u."isActive"`,
  }[query.commercialStatus];
  clauses.push(status);
  if (query.search) {
    const haystack = lowerSql(
      Prisma.sql`concat_ws(' ', NULLIF(p.title, ''), NULLIF(p."internalCode", ''), NULLIF(${localitySql}, ''), NULLIF(${neighborhoodSql}, ''))`,
    );
    // strpos is literal: neither %, _ nor a backslash becomes a LIKE wildcard.
    clauses.push(
      Prisma.sql`strpos(${haystack}, ${query.search.toLowerCase()}) > 0`,
    );
  }
  if (query.propertyType)
    clauses.push(
      Prisma.sql`p."propertyType" = ${query.propertyType}::"PropertyType"`,
    );
  if (query.listingType)
    clauses.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "PropertyListing" l WHERE l."propertyId" = p.id AND l."tenantId" = p."tenantId" AND l."listingType" = ${query.listingType}::"PropertyListingType")`,
    );
  if (query.provinceId)
    clauses.push(Prisma.sql`p."provinceId" = ${query.provinceId}`);
  if (query.localityId)
    clauses.push(Prisma.sql`p."localityId" = ${query.localityId}`);
  if (query.neighborhoodId)
    clauses.push(Prisma.sql`p."neighborhoodId" = ${query.neighborhoodId}`);
  if (query.attention) {
    const hasListing = Prisma.sql`EXISTS (SELECT 1 FROM "PropertyListing" l WHERE l."propertyId" = p.id AND l."tenantId" = p."tenantId")`;
    const description = jsTrimSql(Prisma.sql`COALESCE(p.description, '')`);
    // PostgreSQL counts codepoints; each supplementary character adds a UTF-16 unit.
    const descriptionLength = Prisma.sql`char_length(${description}) + char_length(regexp_replace(${description}, ${'[^\u{10000}-\u{10ffff}]'}, '', 'g'))`;
    const attention = {
      'without-images': Prisma.sql`NOT EXISTS (SELECT 1 FROM "PropertyImage" image WHERE image."propertyId" = p.id AND image."tenantId" = p."tenantId")`,
      'without-commercialization': Prisma.sql`NOT ${hasListing}`,
      'without-description': Prisma.sql`(${descriptionLength}) < ${PROPERTY_DESCRIPTION_MIN_LENGTH}`,
      'without-features': Prisma.sql`NOT EXISTS (SELECT 1 FROM "PropertyFeatureAssignment" feature WHERE feature."propertyId" = p.id AND feature."tenantId" = p."tenantId")`,
      'pending-publication': Prisma.sql`${hasListing} AND NOT u.published`,
      'without-price': Prisma.sql`EXISTS (SELECT 1 FROM "PropertyListing" l WHERE l."propertyId" = p.id AND l."tenantId" = p."tenantId" AND l.status = 'ACTIVE' AND NOT ${listingEligibleSql})`,
      'recently-archived': Prisma.sql`p."updatedAt" >= ${propertyRecentlyArchivedThreshold(now)}`,
    }[query.attention];
    clauses.push(
      query.attention === 'recently-archived'
        ? Prisma.sql`NOT u."isActive"`
        : Prisma.sql`u."isActive"`,
      attention,
    );
  }
  return Prisma.join(
    clauses.map((clause) => Prisma.sql`(${clause})`),
    ' AND ',
  );
}

export function propertyListOrderSql(query: PropertyListQueryDto): Prisma.Sql {
  const direction =
    query.sortOrder === 'asc' ? Prisma.sql`ASC` : Prisma.sql`DESC`;
  const keys = {
    updatedAt: [Prisma.sql`f."updatedAt"`],
    title: [Prisma.sql`${lowerSql(Prisma.sql`f.title`)} COLLATE "C"`],
    propertyType: [
      Prisma.sql`CASE f."propertyType"
      WHEN 'FIELD' THEN 0 WHEN 'HOUSE' THEN 1 WHEN 'COUNTRY_HOUSE' THEN 2
      WHEN 'GARAGE' THEN 3 WHEN 'APARTMENT' THEN 4 WHEN 'WAREHOUSE' THEN 5
      WHEN 'INDUSTRIAL' THEN 6 WHEN 'COMMERCIAL' THEN 7 WHEN 'OFFICE' THEN 8
      WHEN 'OTHER' THEN 9 WHEN 'PH' THEN 10 WHEN 'LAND' THEN 11 END`,
    ],
    location: [
      Prisma.sql`NULLIF(${lowerSql(Prisma.sql`f.locality`)}, '') COLLATE "C"`,
      Prisma.sql`NULLIF(${lowerSql(Prisma.sql`f.neighborhood`)}, '') COLLATE "C"`,
    ],
    commercialStatus: [
      Prisma.sql`CASE WHEN f.published THEN 0 WHEN f."isActive" THEN 1 ELSE 2 END`,
    ],
    createdBy: [
      Prisma.sql`${lowerSql(Prisma.sql`f.creator_sort`)} COLLATE "C"`,
    ],
  }[query.sortBy];
  return Prisma.sql`${Prisma.join(keys.map((key) => Prisma.sql`${key} ${direction} NULLS LAST`))}, f.id COLLATE "C" ASC`;
}
