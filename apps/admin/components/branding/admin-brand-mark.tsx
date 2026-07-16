import Image from "next/image";
import { ADMIN_BRAND_ASSETS } from "@/lib/constants/brand";
import { cn } from "@/lib/cn";

export type AdminBrandVariant = "login";

type AdminBrandMarkProps = {
  variant?: AdminBrandVariant;
  className?: string;
};

/**
 * Valorar platform brand mark (login / product surfaces).
 * Sidebar tenant identity uses `TenantBrandMark` instead.
 */
export function AdminBrandMark({
  variant = "login",
  className,
}: AdminBrandMarkProps) {
  void variant;

  return (
    <Image
      src={ADMIN_BRAND_ASSETS.logo}
      alt="Valorar Inmuebles"
      width={252}
      height={76}
      priority
      className={cn(
        "h-14 w-auto max-w-[252px] sm:h-[3.85rem] sm:max-w-[280px]",
        className,
      )}
    />
  );
}
