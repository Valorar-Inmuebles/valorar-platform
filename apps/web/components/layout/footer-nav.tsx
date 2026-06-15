import Link from "next/link";
import type { NavItem } from "@/lib/constants/navigation";

type FooterNavProps = {
  title: string;
  items: NavItem[];
};

export function FooterNav({ title, items }: FooterNavProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
        {title}
      </h2>
      <ul className="mt-4 space-y-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="text-sm text-white/80 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
