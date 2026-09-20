"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@repo/ui/tabs";

const ITEMS = [
  { value: "/alquileres", label: "Resumen" },
  { value: "/alquileres/contratos", label: "Contratos" },
  { value: "/alquileres/vencimientos", label: "Vencimientos" },
];

export function RentalModuleNav() {
  const pathname = usePathname();
  const router = useRouter();
  const value = pathname?.startsWith("/alquileres/vencimientos")
    ? "/alquileres/vencimientos"
    : pathname?.startsWith("/alquileres/contratos") ||
        (pathname !== "/alquileres" &&
          pathname !== "/alquileres/crear" &&
          pathname?.startsWith("/alquileres/"))
      ? "/alquileres/contratos"
      : "/alquileres";

  return (
    <Tabs
      ariaLabel="Navegación de alquileres"
      items={ITEMS}
      value={value}
      onChange={(next) => router.push(next)}
    />
  );
}
