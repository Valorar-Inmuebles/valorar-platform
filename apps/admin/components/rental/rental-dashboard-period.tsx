"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Select } from "@repo/ui/select";

function monthOptions(value: string) {
  const [year, month] = value.split("-").map(Number);
  const anchor = new Date(Date.UTC(year!, month! - 1, 1));
  return Array.from({ length: 13 }, (_, index) => {
    const date = new Date(anchor);
    date.setUTCMonth(date.getUTCMonth() + index - 6);
    const key = date.toISOString().slice(0, 7);
    const formatted = new Intl.DateTimeFormat("es-AR", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    })
      .format(date)
      .replace(" de ", " ");
    return {
      value: key,
      label: formatted.charAt(0).toUpperCase() + formatted.slice(1),
    };
  });
}

export function RentalDashboardPeriod({ value }: { value: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  return (
    <div className="w-48">
      <Select
        value={value}
        options={monthOptions(value)}
        onChange={(next) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("periodo", next);
          router.replace(`${pathname}?${params.toString()}`, {
            scroll: false,
          });
        }}
      />
    </div>
  );
}
