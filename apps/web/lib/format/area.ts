export function formatArea(totalArea: number | null): string | null {
  if (totalArea == null) {
    return null;
  }

  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(totalArea)} m²`;
}

export function formatSquareMeters(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)} m²`;
}

export function formatLinearMeters(value: number | null): string | null {
  if (value == null) {
    return null;
  }

  return `${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value)} m`;
}

export function formatPropertyAge(yearBuilt: number | null): string | null {
  if (yearBuilt == null) {
    return null;
  }

  const age = new Date().getFullYear() - yearBuilt;

  if (age <= 0) {
    return "A estrenar";
  }

  return age === 1 ? "1 año" : `${age} años`;
}
