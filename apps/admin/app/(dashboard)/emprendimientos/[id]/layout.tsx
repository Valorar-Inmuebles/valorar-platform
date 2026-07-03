import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { DevelopmentExecutiveHeader } from "@/components/development/development-executive-header";
import { DevelopmentExecutiveKpis } from "@/components/development/development-executive-kpis";
import { DevelopmentExecutiveSkeleton } from "@/components/development/development-executive-skeleton";
import { DevelopmentSubNav } from "@/components/development/development-sub-nav";
import { ApiError } from "@/lib/api/client";
import { loadDevelopmentExecutiveContext } from "@/lib/development/load-development-executive-context";
import { developmentDetailBreadcrumbs } from "@/lib/development/breadcrumbs";

type DevelopmentDetailLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
};

type DevelopmentExecutiveBarProps = {
  developmentId: string;
};

async function DevelopmentExecutiveBar({
  developmentId,
}: DevelopmentExecutiveBarProps) {
  try {
    const { development, snapshot } =
      await loadDevelopmentExecutiveContext(developmentId);

    return (
      <>
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
            {developmentDetailBreadcrumbs(developmentId, development.title).map(
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

        <div className="sticky top-0 z-20 -mx-1 space-y-2 bg-[var(--background,#fafafa)]/95 px-1 pb-2 pt-1 backdrop-blur supports-[backdrop-filter]:bg-[var(--background,#fafafa)]/80">
          <DevelopmentExecutiveHeader
            development={development}
            snapshot={snapshot}
          />
          <DevelopmentExecutiveKpis
            developmentId={developmentId}
            snapshot={snapshot}
          />
          <DevelopmentSubNav developmentId={developmentId} />
        </div>
      </>
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      notFound();
    }

    throw error;
  }
}

export default async function DevelopmentDetailLayout({
  children,
  params,
}: DevelopmentDetailLayoutProps) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-4">
      <Suspense fallback={<DevelopmentExecutiveSkeleton />}>
        <DevelopmentExecutiveBar developmentId={id} />
      </Suspense>
      <div>{children}</div>
    </div>
  );
}
