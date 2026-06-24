import type { ReactNode } from "react";

type PropertyDetailSectionProps = {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function PropertyDetailSection({
  title,
  description,
  children,
  className = "",
}: PropertyDetailSectionProps) {
  return (
    <section className={`mt-10 ${className}`}>
      <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-text-secondary">{description}</p>
      ) : null}
      <div className={description ? "mt-6" : "mt-6"}>{children}</div>
    </section>
  );
}
