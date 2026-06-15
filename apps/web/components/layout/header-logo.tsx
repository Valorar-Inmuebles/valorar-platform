import Image from "next/image";
import Link from "next/link";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";

export function HeaderLogo() {
  const { companyName } = getPublicSiteConfig();

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`${companyName} — Inicio`}
    >
      <Image
        src={BRAND_ASSETS.logo}
        alt={companyName}
        width={160}
        height={48}
        priority
        className="h-10 w-auto md:h-11"
      />
    </Link>
  );
}
