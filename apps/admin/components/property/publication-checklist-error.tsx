import Link from "next/link";
import { ErrorMessage } from "@repo/ui/form-field";
import type { PublicationCheckKey } from "@repo/property-rules";
import {
  getPublicationCtaGroupsForMissing,
  resolvePublicationCheckHref,
} from "@/lib/property/publication-check-keys";
import { getPublicationCheckLabel } from "@repo/property-rules";

type PublicationChecklistErrorProps = {
  message: string;
  missing: PublicationCheckKey[];
  propertyId: string;
  listingId?: string;
};

export function PublicationChecklistError({
  message,
  missing,
  propertyId,
  listingId,
}: PublicationChecklistErrorProps) {
  const ctaGroups = getPublicationCtaGroupsForMissing(
    missing,
    propertyId,
    listingId,
  );

  return (
    <div className="space-y-3">
      <ErrorMessage>{message}</ErrorMessage>

      {missing.length > 0 ? (
        <ul className="space-y-1 text-sm text-muted">
          {missing.map((key) => {
            const href = resolvePublicationCheckHref(
              key,
              propertyId,
              listingId,
            );
            const label = getPublicationCheckLabel(key);

            return (
              <li key={key}>
                {href ? (
                  <Link
                    href={href}
                    className="font-medium text-primary underline-offset-2 hover:underline"
                  >
                    {label}
                  </Link>
                ) : (
                  label
                )}
              </li>
            );
          })}
        </ul>
      ) : null}

      {ctaGroups.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          {ctaGroups.map((group) => (
            <Link
              key={group.id}
              href={group.href}
              className="inline-flex items-center rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:bg-zinc-50"
            >
              {group.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
