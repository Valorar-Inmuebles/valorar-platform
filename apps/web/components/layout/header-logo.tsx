import Link from "next/link";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";

/**
 * Text-based logo until the tenant provides `public/brand/logo.svg`.
 * Replace with next/image when logo.svg is available — see public/brand/README.md.
 */
export function HeaderLogo() {
  const { companyName } = getPublicSiteConfig();

  return (
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`${companyName} — Inicio`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-white">
        {companyName.charAt(0).toUpperCase()}
      </span>
      <span className="hidden text-base font-semibold text-foreground sm:inline">
        {companyName}
      </span>
    </Link>
  );
}
