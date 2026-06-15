import { getSiteConfig } from "@/config/site";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { JsonLd } from "@/components/seo/json-ld";

export function OrganizationJsonLd() {
  const site = getSiteConfig();

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.companyName,
    url: site.siteUrl,
    logo: `${site.siteUrl}${BRAND_ASSETS.logo512}`,
    description: site.description,
  };

  if (site.phone) {
    data.telephone = site.phone;
  }

  if (site.email) {
    data.email = site.email;
  }

  if (site.address) {
    data.address = {
      "@type": "PostalAddress",
      streetAddress: site.address,
    };
  }

  const sameAs = [
    site.social.facebook,
    site.social.instagram,
    site.social.linkedin,
  ].filter(Boolean);

  if (sameAs.length > 0) {
    data.sameAs = sameAs;
  }

  return <JsonLd data={data} />;
}
