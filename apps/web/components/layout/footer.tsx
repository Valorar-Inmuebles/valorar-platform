import Image from "next/image";
import Link from "next/link";
import {
  FOOTER_DESCRIPTION,
  FOOTER_SOCIAL_LINKS,
  FOOTER_USEFUL_ITEMS,
} from "@/lib/constants/navigation";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { CONTACT_OFFICES } from "@/lib/contact/contact-content";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { FooterCopyright } from "./footer-copyright";
import { FooterNav } from "./footer-nav";
import { FooterOffice } from "./footer-office";
import { FooterSocial } from "./footer-social";
import { SiteContainer } from "./site-container";

const FOOTER_CTA_LINK_CLASS =
  "text-sm font-medium text-brand-green transition-colors hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

export function Footer() {
  const site = getPublicSiteConfig();
  const casaCentral = CONTACT_OFFICES.find((office) => office.id === "casa-central");
  const sucursalFlores = CONTACT_OFFICES.find(
    (office) => office.id === "sucursal-flores",
  );

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
          <div>
            <Link href="/" className="inline-flex">
              <Image
                src={BRAND_ASSETS.logo}
                alt={site.companyName}
                width={220}
                height={66}
                className="h-14 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm whitespace-pre-line text-sm leading-relaxed text-text-secondary">
              {FOOTER_DESCRIPTION}
            </p>
            <p className="mt-4">
              <Link href="/nosotros" className={FOOTER_CTA_LINK_CLASS}>
                Leer más →
              </Link>
            </p>
          </div>

          {casaCentral ? <FooterOffice office={casaCentral} /> : null}
          {sucursalFlores ? <FooterOffice office={sucursalFlores} /> : null}

          <div>
            <FooterNav title="Información útil" items={FOOTER_USEFUL_ITEMS} />
            <p className="mt-4">
              <Link href="/contacto" className={FOOTER_CTA_LINK_CLASS}>
                Contáctenos →
              </Link>
            </p>
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
