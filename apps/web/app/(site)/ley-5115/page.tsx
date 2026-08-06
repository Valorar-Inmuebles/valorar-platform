import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import {
  LegalArticle,
  LegalDocumentCard,
} from "@/components/legal/legal-document-card";
import { createPageMetadata } from "@/lib/seo/metadata";
import {
  LEY_5115_ARTICLES,
  LEY_5115_META,
  LEY_5115_METADATA,
  LEY_5115_PREAMBLE,
  LEY_5115_SIGNATORIES,
} from "@/lib/legal/ley-5115-content";

export const metadata: Metadata = createPageMetadata({
  title: LEY_5115_META.title,
  description: LEY_5115_META.description,
  path: LEY_5115_META.path,
});

export default function Ley5115Page() {
  return (
    <section className="bg-surface-base">
      <PageShell
        title={LEY_5115_META.title}
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: LEY_5115_META.title },
        ]}
      >
        <LegalDocumentCard>
          <p className="text-center text-lg font-semibold tracking-tight text-text-primary md:text-xl">
            {LEY_5115_META.documentTitle}
          </p>

          <dl className="space-y-1.5">
            {LEY_5115_METADATA.map((item) => (
              <div key={item.label} className="flex flex-wrap gap-x-2">
                <dt className="font-semibold text-text-primary">
                  {item.label}:
                </dt>
                <dd>{item.value}</dd>
              </div>
            ))}
          </dl>

          <p className="font-semibold text-text-primary">{LEY_5115_PREAMBLE}</p>

          <div className="space-y-5">
            {LEY_5115_ARTICLES.map((article) => (
              <LegalArticle
                key={article.label}
                label={article.label}
                body={article.body}
              />
            ))}
          </div>

          <div className="space-y-1 pt-2 font-semibold uppercase tracking-wide text-text-primary">
            {LEY_5115_SIGNATORIES.map((name) => (
              <p key={name}>{name}</p>
            ))}
          </div>
        </LegalDocumentCard>
      </PageShell>
    </section>
  );
}
