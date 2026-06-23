import Link from "next/link";
import {
  ApartmentIcon,
  BuildingIcon,
  HouseIcon,
} from "@/components/icons";
import { SiteContainer } from "@/components/layout/site-container";

type CategoryItem = {
  title: string;
  description: string;
  href: string;
  label: string;
  icon: "house" | "apartment" | "development";
};

const CATEGORIES: CategoryItem[] = [
  {
    title: "Casas",
    label: "Residencial",
    description: "Espacios amplios para familias",
    href: "/propiedades?propertyType=HOUSE",
    icon: "house",
  },
  {
    title: "Departamentos",
    label: "Urbano",
    description: "Vida urbana con excelente ubicación",
    href: "/propiedades?propertyType=APARTMENT",
    icon: "apartment",
  },
  {
    title: "Emprendimientos",
    label: "Inversión",
    description: "Proyectos en pozo y terminados",
    href: "/emprendimientos",
    icon: "development",
  },
];

function CategoryIcon({ icon }: { icon: CategoryItem["icon"] }) {
  const iconProps = {
    size: 28,
    className: "text-brand-green/80 transition-colors group-hover:text-brand-green",
  };

  switch (icon) {
    case "house":
      return <HouseIcon {...iconProps} />;
    case "apartment":
      return <ApartmentIcon {...iconProps} />;
    case "development":
      return <BuildingIcon {...iconProps} />;
  }
}

export function CategoryGrid() {
  return (
    <section className="border-t border-border-default bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="mb-10">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Explorá por categoría
          </h2>
          <p className="mt-2 text-text-secondary">
            Encontrá el tipo de propiedad que mejor se adapta a vos.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3 md:gap-6">
          {CATEGORIES.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group flex min-h-52 flex-col justify-between rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green md:min-h-56 md:p-7"
            >
              <div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-brand-orange">
                    {category.label}
                  </span>
                  <CategoryIcon icon={category.icon} />
                </div>
                <h3 className="mt-5 text-2xl font-semibold tracking-tight text-text-primary">
                  {category.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {category.description}
                </p>
              </div>
              <span className="mt-6 inline-flex text-sm font-medium text-brand-green underline-offset-4 transition group-hover:underline">
                Ver opciones
              </span>
            </Link>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
