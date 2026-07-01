import { PropertyDetailSkeleton } from "@/components/property/property-detail-skeleton";
import { PropertyExecutiveSkeleton } from "@/components/property/property-executive-skeleton";

export default function PropiedadDetalleLoading() {
  return (
    <div className="flex flex-col gap-4">
      <PropertyExecutiveSkeleton />
      <PropertyDetailSkeleton embedded />
    </div>
  );
}
