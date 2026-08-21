/**
 * Editorial order for Development listings (admin + public).
 *
 * sortOrder ASC keeps imported historical records (1..n) after new ABM
 * records (default 0). createdAt DESC orders ties (new first). id ASC is a
 * deterministic last resort. updatedAt is intentionally excluded: edits
 * must not reshuffle the list.
 */
export const DEVELOPMENT_LIST_ORDER_BY = [
  { sortOrder: 'asc' as const },
  { createdAt: 'desc' as const },
  { id: 'asc' as const },
];
