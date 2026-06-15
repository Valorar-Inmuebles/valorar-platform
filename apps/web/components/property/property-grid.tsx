import type { ReactNode } from "react";

type PropertyGridProps = {
  children: ReactNode;
  columns?: "featured" | "recent" | "listing";
};

const columnClasses = {
  featured: "grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
  recent: "grid gap-6 sm:grid-cols-2 lg:grid-cols-4",
  listing: "grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3",
};

export function PropertyGrid({ children, columns = "recent" }: PropertyGridProps) {
  return <div className={columnClasses[columns]}>{children}</div>;
}
