"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DatePicker,
  DateRangePicker,
  type DateRange,
} from "@/components/ui/date-picker";

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-600">{children}</p>;
}

export function DatePickerShowcase() {
  const [date, setDate] = useState<Date | undefined>();
  const [preDate, setPreDate] = useState<Date>(new Date(2026, 3, 18));

  const [range, setRange] = useState<DateRange>({});
  const [preRange, setPreRange] = useState<DateRange>({
    from: new Date(2026, 3, 14),
    to: new Date(2026, 3, 25),
  });

  return (
    <Card flat>
      <CardHeader>
        <CardTitle>Date Picker</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          DatePicker · DateRangePicker
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* DatePicker */}
        <div className="space-y-1.5">
          <SectionLabel>DatePicker — single date</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <FieldLabel>Default</FieldLabel>
              <DatePicker
                value={date}
                onChange={setDate}
                placeholder="Pick a date…"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>With value</FieldLabel>
              <DatePicker
                value={preDate}
                onChange={setPreDate}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Disabled</FieldLabel>
              <DatePicker
                value={new Date(2026, 3, 18)}
                disabled
              />
            </div>
          </div>
        </div>

        <Divider />

        {/* DateRangePicker */}
        <div className="space-y-1.5">
          <SectionLabel>DateRangePicker — date range</SectionLabel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <FieldLabel>Default</FieldLabel>
              <DateRangePicker
                value={range}
                onChange={setRange}
                placeholder="Pick a range…"
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>With range</FieldLabel>
              <DateRangePicker
                value={preRange}
                onChange={setPreRange}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Disabled</FieldLabel>
              <DateRangePicker
                value={{ from: new Date(2026, 3, 14), to: new Date(2026, 3, 25) }}
                disabled
              />
            </div>
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
