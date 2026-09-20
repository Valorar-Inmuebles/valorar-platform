export type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

export function getPaginationItems(
  page: number,
  totalPages: number,
  siblingCount = 1,
): PaginationItem[] {
  if (totalPages <= 0) return [];
  const current = Math.min(Math.max(page, 1), totalPages);
  const visible = new Set<number>([1, totalPages]);
  for (
    let candidate = current - siblingCount;
    candidate <= current + siblingCount;
    candidate += 1
  ) {
    if (candidate >= 1 && candidate <= totalPages) visible.add(candidate);
  }
  const pages = [...visible].sort((left, right) => left - right);
  const result: PaginationItem[] = [];
  pages.forEach((candidate, index) => {
    const previous = pages[index - 1];
    if (previous !== undefined && candidate - previous > 1) {
      result.push(index === 1 ? "ellipsis-start" : "ellipsis-end");
    }
    result.push(candidate);
  });
  return result;
}
