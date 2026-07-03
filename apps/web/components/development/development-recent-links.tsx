import Link from "next/link";
import type { PublicDevelopmentCard } from "@repo/shared-types";

type DevelopmentRecentLinksProps = {
  developments: PublicDevelopmentCard[];
};

export function DevelopmentRecentLinks({
  developments,
}: DevelopmentRecentLinksProps) {
  if (developments.length === 0) {
    return null;
  }

  return (
    <div className="border-t border-border pt-6">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        Emprendimientos recientes
      </p>
      <ul className="mt-3 space-y-2">
        {developments.map((development) => (
          <li key={development.id}>
            <Link
              href={`/emprendimientos/${development.slug}`}
              className="text-sm text-text-primary transition hover:text-brand-green"
            >
              {development.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
