import {
  FOOTER_CONTACT,
  FOOTER_DESCRIPTION,
  FOOTER_NAV_ITEMS,
  FOOTER_SERVICE_ITEMS,
  FOOTER_SOCIAL_LINKS,
} from "@/lib/constants/navigation";
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
    <footer className="border-t border-border bg-[#1a1a1a] text-white">
      <SiteContainer className="py-12 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <p className="text-lg font-semibold">{site.companyName}</p>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
              {FOOTER_DESCRIPTION}
            </p>
          </div>

          <FooterNav title="Navegación" items={FOOTER_NAV_ITEMS} />
          <FooterNav title="Servicios" items={FOOTER_SERVICE_ITEMS} />

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
              Contacto
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              <li>
                <a
                  href={`tel:${contact.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-white"
                >
                  {contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${contact.email}`}
                  className="transition-colors hover:text-white"
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
          <div className="mt-10 border-t border-white/10 pt-8">
            <FooterSocial links={socialLinks} />
          </div>
        ) : null}

        <FooterCopyright companyName={site.companyName} />
      </SiteContainer>
    </footer>
  );
}
