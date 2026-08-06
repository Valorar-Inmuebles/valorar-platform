import type { ReactNode } from "react";
import { Card, CardContent } from "@repo/ui/card";

type LegalDocumentCardProps = {
  children: ReactNode;
};

/** Readable content card for legal / compliance pages. */
export function LegalDocumentCard({ children }: LegalDocumentCardProps) {
  return (
    <Card className="border-border-default bg-surface-card shadow-sm ring-1 ring-black/[0.03]">
      <CardContent className="px-6 py-8 md:px-10 md:py-12 lg:px-12">
        <div className="mx-auto max-w-3xl space-y-6 text-base leading-relaxed text-text-secondary md:text-[1.0625rem] md:leading-[1.75]">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

export function LegalArticle({
  label,
  body,
}: {
  label: string;
  body: string;
}) {
  return (
    <p>
      <strong className="font-semibold text-text-primary">{label}</strong>{" "}
      {body}
    </p>
  );
}
