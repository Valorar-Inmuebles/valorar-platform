export function formatArea(totalArea: number | null): string | null {
  if (totalArea == null) {
    return null;
  }

  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(totalArea)} m²`;
}
