import Image from "next/image";
import Link from "next/link";
import {
  FOOTER_CONTACT,
  FOOTER_DESCRIPTION,
  FOOTER_NAV_ITEMS,
  FOOTER_SERVICE_ITEMS,
  FOOTER_SOCIAL_LINKS,
} from "@/lib/constants/navigation";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { FooterCopyright } from "./footer-copyright";
import { FooterNav } from "./footer-nav";
import { FooterSocial } from "./footer-social";
import { SiteContainer } from "./site-container";

export function Footer() {
  const site = getPublicSiteConfig();

  const contact = {
    phone: site.phone || FOOTER_CONTACT.phone,
    email: site.email || FOOTER_CONTACT.email,
    address: site.address || FOOTER_CONTACT.address,
    hours: FOOTER_CONTACT.hours,
  };

  const socialLinks = FOOTER_SOCIAL_LINKS.map((link) => {
    const envUrl =
      link.icon === "facebook"
        ? site.social.facebook
        : link.icon === "instagram"
          ? site.social.instagram
          : site.social.linkedin;

    return {
      ...link,
      href: envUrl || link.href,
    };
  }).filter((link) => link.href.length > 0);

  return (
    <footer className="border-t border-border-default bg-surface-alt text-text-primary">
      <SiteContainer className="py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex">
              <Image
                src={BRAND_ASSETS.logo}
                alt={site.companyName}
                width={160}
                height={48}
                className="h-10 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              {FOOTER_DESCRIPTION}
            </p>
          </div>

          <FooterNav title="Navegación" items={FOOTER_NAV_ITEMS} />
          <FooterNav title="Servicios" items={FOOTER_SERVICE_ITEMS} />

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
              Contacto
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-text-secondary">
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-brand-green"
                >
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors hover:text-brand-green"
                >
                  {contact.email}
                </a>
              </li>
              <li>{contact.address}</li>
              <li>{contact.hours}</li>
            </ul>
          </div>
        </div>

        {socialLinks.length > 0 ? (
          <div className="mt-10 border-t border-border-default pt-8">
            <FooterSocial links={socialLinks} />
          </div>
        ) : null}

        <FooterCopyright companyName={site.companyName} />
      </SiteContainer>
    </footer>
  );
}
