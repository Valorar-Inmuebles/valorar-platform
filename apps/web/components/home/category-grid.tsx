import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";

type CategoryItem = {
  title: string;
  description: string;
  href: string;
  gradient: string;
};

const CATEGORIES: CategoryItem[] = [
  {
    title: "Casas",
    description: "Espacios amplios para familias",
    href: "/propiedades?propertyType=HOUSE",
    gradient: "from-slate-900/80 via-slate-800/70 to-primary/70",
  },
  {
    title: "Departamentos",
    description: "Vida urbana con excelente ubicación",
    href: "/propiedades?propertyType=APARTMENT",
    gradient: "from-primary/80 via-slate-900/75 to-slate-800/70",
  },
  {
    title: "Emprendimientos",
    description: "Proyectos en pozo y terminados",
    href: "/emprendimientos",
    gradient: "from-secondary/80 via-slate-900/75 to-slate-800/70",
  },
];

export function CategoryGrid() {
  return (
    <section className="py-16 md:py-20">
      <SiteContainer>
        <div className="mb-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Explorá por categoría
          </h2>
          <p className="mt-2 text-muted">
            Encontrá el tipo de propiedad que mejor se adapta a vos.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {CATEGORIES.map((category) => (
            <Link
              key={category.title}
              href={category.href}
              className="group relative min-h-56 overflow-hidden rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <div
                className={`absolute inset-0 bg-gradient-to-br ${category.gradient}`}
              />
              <div className="absolute inset-0 bg-black/10 transition group-hover:bg-black/20" />
              <div className="relative flex h-full flex-col justify-end p-6 text-white">
                <h3 className="text-2xl font-semibold">{category.title}</h3>
                <p className="mt-2 text-sm text-white/85">{category.description}</p>
                <span className="mt-4 inline-flex text-sm font-medium text-white/90 underline-offset-4 group-hover:underline">
                  Ver opciones
                </span>
              </div>
            </Link>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
