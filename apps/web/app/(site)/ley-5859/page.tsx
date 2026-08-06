import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import {
  LegalArticle,
  LegalDocumentCard,
} from "@/components/legal/legal-document-card";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  LEY_5859_ARTICLES,
  LEY_5859_DECREE,
  LEY_5859_HEADER,
  LEY_5859_META,
} from "@/lib/legal/ley-5859-content";

export const metadata: Metadata = createPageMetadata({
  title: LEY_5859_META.title,
  description: LEY_5859_META.description,
  path: LEY_5859_META.path,
});

export default function Ley5859Page() {
  return (
    <section className="bg-surface-base">
      <PageShell
        title={LEY_5859_META.title}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: LEY_5859_META.title },
        ]}
      >
        <LegalDocumentCard>
          <div className="space-y-2 text-center">
            <p className="text-lg font-semibold tracking-tight text-text-primary md:text-xl">
              {LEY_5859_HEADER.government}
            </p>
            <p className="italic text-text-secondary">
              {LEY_5859_HEADER.yearMotto}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
            <p className="font-semibold text-text-primary">
              {LEY_5859_HEADER.documentTitle}
            </p>
            <p className="text-sm text-text-secondary sm:text-right">
              {LEY_5859_HEADER.date}
            </p>
          </div>

          <p className="text-center font-semibold text-text-primary">
            {LEY_5859_HEADER.preamble}
          </p>

          <div className="space-y-5">
            {LEY_5859_ARTICLES.map((article) => (
              <LegalArticle
                key={article.label}
                label={article.label}
                body={article.body}
              />
            ))}
          </div>

          <p className="pt-4 text-right text-sm text-text-secondary">
            {LEY_5859_DECREE.date}
          </p>

          <div className="space-y-4 border-t border-border-default pt-8">
            <p className="text-center text-lg font-semibold tracking-tight text-text-primary">
              {LEY_5859_DECREE.title}
            </p>
            <p>{LEY_5859_DECREE.body}</p>
            <p className="font-semibold uppercase tracking-wide text-text-primary">
              {LEY_5859_DECREE.signatories}
            </p>
          </div>
        </LegalDocumentCard>
      </PageShell>
    </section>
  );
}
