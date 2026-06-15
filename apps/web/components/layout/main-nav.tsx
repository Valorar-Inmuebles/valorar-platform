import { MAIN_NAV_ITEMS } from "@/lib/constants/navigation";
import { NavLink } from "./nav-link";

type MainNavProps = {
  className?: string;
};

export function MainNav({ className = "" }: MainNavProps) {
  return (
    <nav aria-label="Navegación principal" className={className}>
      <ul className="flex items-center gap-6 xl:gap-8">
        {MAIN_NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <NavLink href={item.href} label={item.label} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
