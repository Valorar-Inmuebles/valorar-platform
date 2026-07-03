import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_WORK_STYLE } from "@/lib/about/about-content";
import { AboutWorkStyleIcon } from "./about-work-style-icon";

export function AboutWorkStyleSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Nuestra forma de trabajar
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">
            Cuatro pilares que guían cada operación y definen nuestra manera de
            acompañarte.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:gap-6">
          {ABOUT_WORK_STYLE.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <AboutWorkStyleIcon name={item.icon} size={20} />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-text-primary">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
