import { DevelopmentDetailSkeleton } from "@/components/development/development-detail-skeleton";
import { DevelopmentExecutiveSkeleton } from "@/components/development/development-executive-skeleton";

export default function EmprendimientoDetalleLoading() {
  return (
    <div className="flex flex-col gap-4">
      <DevelopmentExecutiveSkeleton />
      <DevelopmentDetailSkeleton embedded />
    </div>
  );
}
