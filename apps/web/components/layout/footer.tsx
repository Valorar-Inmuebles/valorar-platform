import Image from "next/image";
import Link from "next/link";
import { Clock, Mail } from "lucide-react";
import { WhatsappIcon } from "@/components/icons";
import {
  FOOTER_CONTACT,
  FOOTER_DESCRIPTION,
  FOOTER_INSTITUTIONAL_ITEMS,
  FOOTER_NAV_ITEMS,
  FOOTER_SOCIAL_LINKS,
} from "@/lib/constants/navigation";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";
import { FooterCopyright } from "./footer-copyright";
import { FooterNav } from "./footer-nav";
import { FooterSocial } from "./footer-social";
import { SiteContainer } from "./site-container";

const CONTACT_ICON_CLASS = "mt-0.5 size-[18px] shrink-0 text-brand-green";
const CONTACT_ROW_CLASS = "flex items-start gap-2.5";
const CONTACT_LINK_CLASS =
  "transition-colors hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

export function Footer() {
  const site = getPublicSiteConfig();

  const contact = {
    whatsappPhone: site.whatsapp || FOOTER_CONTACT.whatsapp,
    whatsappDisplay: FOOTER_CONTACT.whatsapp,
    email: FOOTER_CONTACT.email,
    hours: FOOTER_CONTACT.hours,
  };
  const whatsappUrl = getWhatsAppUrl({
    phone: contact.whatsappPhone,
    message: "Hola, me gustaría realizar una consulta.",
  });

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
                width={192}
                height={58}
                className="h-12 w-auto"
              />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-text-secondary">
              {FOOTER_DESCRIPTION}
            </p>
          </div>

          <FooterNav title="EXPLORAR" items={FOOTER_NAV_ITEMS} />
          <FooterNav title="INSTITUCIONAL" items={FOOTER_INSTITUTIONAL_ITEMS} />

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-primary">
              CONTACTO
            </h2>
            <ul className="mt-4 space-y-3 text-sm text-text-secondary">
              <li className={CONTACT_ROW_CLASS}>
                <WhatsappIcon size={18} className={CONTACT_ICON_CLASS} />
                {whatsappUrl ? (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={CONTACT_LINK_CLASS}
                  >
                    {contact.whatsappDisplay}
                  </a>
                ) : (
                  <span>{contact.whatsappDisplay}</span>
                )}
              </li>
              <li className={CONTACT_ROW_CLASS}>
                <Mail
                  size={18}
                  strokeWidth={1.75}
                  className={CONTACT_ICON_CLASS}
                  aria-hidden
                />
                <a
                  href={`mailto:${contact.email}`}
                  className={CONTACT_LINK_CLASS}
                >
                  {contact.email}
                </a>
              </li>
              <li className={CONTACT_ROW_CLASS}>
                <Clock
                  size={18}
                  strokeWidth={1.75}
                  className={CONTACT_ICON_CLASS}
                  aria-hidden
                />
                <span className="whitespace-pre-line">{contact.hours}</span>
              </li>
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
