import Image from "next/image";
import { ADMIN_BRAND_ASSETS } from "@/lib/constants/brand";
import { cn } from "@/lib/cn";

export type AdminBrandVariant = "login" | "sidebar" | "sidebar-compact";

type AdminBrandMarkProps = {
  variant?: AdminBrandVariant;
  className?: string;
};

const variantConfig: Record<
  AdminBrandVariant,
  {
    src: string;
    width: number;
    height: number;
    imageClassName: string;
    alt: string;
  }
> = {
  login: {
    src: ADMIN_BRAND_ASSETS.logo,
    width: 180,
    height: 54,
    imageClassName: "h-10 w-auto max-w-[180px] sm:h-11 sm:max-w-[200px]",
    alt: "Valorar Inmuebles",
  },
  sidebar: {
    src: ADMIN_BRAND_ASSETS.logo,
    width: 168,
    height: 50,
    imageClassName: "h-7 w-auto max-w-[168px]",
    alt: "Valorar Inmuebles",
  },
  "sidebar-compact": {
    src: ADMIN_BRAND_ASSETS.logo48,
    width: 32,
    height: 32,
    imageClassName: "h-8 w-8 object-contain",
    alt: "Valorar",
  },
};

export function AdminBrandMark({
  variant = "login",
  className,
}: AdminBrandMarkProps) {
  const config = variantConfig[variant];

  if (variant === "sidebar") {
    return (
      <div className={cn("flex min-w-0 flex-col gap-1.5", className)}>
        <Image
          src={config.src}
          alt={config.alt}
          width={config.width}
          height={config.height}
          priority
          className={config.imageClassName}
        />
        <span className="text-xs font-semibold tracking-wide text-sidebar-foreground">
          Admin
        </span>
      </div>
    );
  }

  if (variant === "sidebar-compact") {
    return (
      <Image
        src={config.src}
        alt={config.alt}
        width={config.width}
        height={config.height}
        priority
        className={cn(config.imageClassName, className)}
      />
    );
  }

  return (
    <Image
      src={config.src}
      alt={config.alt}
      width={config.width}
      height={config.height}
      priority
      className={cn(config.imageClassName, className)}
    />
  );
}
