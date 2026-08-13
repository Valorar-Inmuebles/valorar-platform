import { BranchOfficeCard } from "@/components/contact/branch-office-card";
import { SiteContainer } from "@/components/layout/site-container";
import {
  CONTACT_OFFICES,
  HOME_BRANCHES,
} from "@/lib/contact/contact-content";

export function HomeBranchesSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {HOME_BRANCHES.title}
          </h2>
          <p className="mt-2 text-text-secondary">{HOME_BRANCHES.description}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {CONTACT_OFFICES.map((office) => (
            <BranchOfficeCard
              key={office.id}
              office={office}
              locationHref={HOME_BRANCHES.locationHref}
              locationLabel={HOME_BRANCHES.locationLabel}
            />
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
