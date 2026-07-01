import type { ReactNode } from "react";

type PropertyGridProps = {
  children: ReactNode;
  columns?: "featured" | "recent" | "listing";
};

const columnClasses = {
  featured: "grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8",
  recent: "grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-7",
  listing: "grid items-stretch gap-7 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3 xl:gap-8",
};

export function PropertyGrid({ children, columns = "recent" }: PropertyGridProps) {
  return <div className={columnClasses[columns]}>{children}</div>;
}
