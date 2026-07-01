import Link from "next/link";
import { notFound } from "next/navigation";
import { PropertyExecutiveHeader } from "@/components/property/property-executive-header";
import { PropertyExecutiveKpis } from "@/components/property/property-executive-kpis";
import { PropertySubNav } from "@/components/property/property-sub-nav";
import { ApiError } from "@/lib/api/client";
import { loadPropertyExecutiveContext } from "@/lib/property/load-property-executive-context";
import { propertyDetailBreadcrumbs } from "@/lib/property/breadcrumbs";

type PropertyDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

export default async function PropertyDetailLayout({
  children,
  params,
}: PropertyDetailLayoutProps) {
  const { id } = await params;

  try {
    const { property, publishability, snapshot } =
      await loadPropertyExecutiveContext(id);

    return (
      <div className="flex flex-col gap-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {propertyDetailBreadcrumbs(id, property.title).map(
              (item, index, items) => {
                const isLast = index === items.length - 1;
                return (
                  <li
                    key={`${item.label}-${index}`}
                    className="flex items-center gap-1.5"
                  >
                    {index > 0 ? <span aria-hidden>›</span> : null}
                    {item.href && !isLast ? (
                      <Link
                        href={item.href}
                        className="transition-colors hover:text-foreground"
                      >
                        {item.label}
                      </Link>
                    ) : (
                      <span
                        className={
                          isLast ? "font-medium text-foreground" : undefined
                        }
                      >
                        {item.label}
                      </span>
                    )}
                  </li>
                );
              },
            )}
          </ol>
        </nav>

        <div className="sticky top-0 z-20 -mx-1 space-y-3 bg-[var(--background,#fafafa)]/95 px-1 pb-3 pt-1 backdrop-blur supports-[backdrop-filter]:bg-[var(--background,#fafafa)]/80">
          <PropertyExecutiveHeader property={property} snapshot={snapshot} />
          <PropertyExecutiveKpis
            propertyId={id}
            snapshot={snapshot}
            publishability={publishability}
          />
          <PropertySubNav propertyId={id} />
        </div>

        <div>{children}</div>
      </div>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}
