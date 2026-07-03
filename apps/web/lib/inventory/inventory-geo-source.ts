/** Minimum geo fields required to build inventory search coverage. */
export type InventoryGeoSource = {
  provinceId: string | null;
  provinceName: string | null;
  localityId: string | null;
  localityName: string | null;
  neighborhoodId?: string | null;
  neighborhoodName?: string | null;
  city: string;
  neighborhood: string | null;
};
