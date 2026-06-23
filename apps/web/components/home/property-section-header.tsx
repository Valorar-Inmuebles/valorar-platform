import Link from "next/link";

type PropertySectionHeaderProps = {
  title: string;
  href?: string;
  linkLabel?: string;
};

export function PropertySectionHeader({
  title,
  href,
  linkLabel = "Ver todas",
}: PropertySectionHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h2>
      {href ? (
        <Link
          href={href}
          className="shrink-0 inline-flex h-10 items-center justify-center rounded-lg border border-brand-green bg-transparent px-4 text-sm font-medium text-brand-green transition hover:bg-brand-green/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
