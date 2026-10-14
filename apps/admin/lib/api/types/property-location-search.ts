export type PropertyLocationSearchPayload = {
  street: string;
  streetNumber?: string;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  province?: string;
  city?: string;
  neighborhood?: string;
  postalCode?: string;
  country: "AR";
};

export type PropertyLocationCandidate = {
  label: string;
  latitude: number;
  longitude: number;
  granularity: "ADDRESS" | "STREET" | "NEIGHBORHOOD" | "LOCALITY";
  warnings: string[];
  bounds?: { south: number; west: number; north: number; east: number };
};

export type PropertyLocationSearchResult = {
  status: "RESULTS" | "NO_RESULTS";
  candidates: PropertyLocationCandidate[];
};
