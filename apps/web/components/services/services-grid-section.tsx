import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { SERVICES_ITEMS } from "@/lib/services/services-content";
import { ServiceIcon } from "./service-icon";

const SECONDARY_CTA_CLASS =
  "mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-brand-green bg-transparent px-4 text-sm font-semibold text-brand-green transition hover:bg-brand-green hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green";

export function ServicesGridSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="mb-10 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Nuestros servicios
          </h2>
          <p className="mt-2 text-text-secondary">
            Soluciones profesionales para cada necesidad inmobiliaria, con el
            respaldo de un equipo especializado.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          {SERVICES_ITEMS.map((service) => (
            <article
              key={service.title}
              className="flex min-h-64 flex-col rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:min-h-72 md:p-7"
            >
              <ServiceIcon
                name={service.icon}
                size={28}
                className="text-brand-green/80"
              />
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-text-primary">
                {service.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary">
                {service.description}
              </p>
              {service.href && service.ctaLabel ? (
                <Link href={service.href} className={SECONDARY_CTA_CLASS}>
                  {service.ctaLabel}
                </Link>
              ) : null}
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
