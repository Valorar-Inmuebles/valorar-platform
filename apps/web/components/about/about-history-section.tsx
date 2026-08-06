import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_HISTORY_PARAGRAPHS } from "@/lib/about/about-content";

export function AboutHistorySection() {
  return (
    <section className="bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,280px)_1fr] lg:gap-16">
          <div className="lg:pt-1">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-orange">
              Trayectoria
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
              Nuestra historia
            </h2>
          </div>

          <div className="space-y-5">
            {ABOUT_HISTORY_PARAGRAPHS.map((paragraph, index) => (
              <p
                key={index}
                className="text-base leading-relaxed text-text-secondary"
              >
                {paragraph.parts.map((part, partIndex) =>
                  part.emphasis ? (
                    <strong
                      key={partIndex}
                      className="font-semibold text-text-primary"
                    >
                      {part.text}
                    </strong>
                  ) : (
                    <span key={partIndex}>{part.text}</span>
                  ),
                )}
              </p>
            ))}
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
