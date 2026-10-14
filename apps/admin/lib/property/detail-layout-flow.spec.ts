import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { propertySubNavHref } from "./navigation";

describe("Property detail scrolling and navigation", () => {
  it("keeps the executive header, indicators and tabs together in normal document flow", () => {
    const layout = readFileSync(
      join(process.cwd(), "app/(dashboard)/propiedades/[id]/layout.tsx"),
      "utf8",
    );
    const tabs = readFileSync(
      join(process.cwd(), "components/property/property-sub-nav.tsx"),
      "utf8",
    );
    expect(layout).toMatch(
      /<div className="space-y-2">\s*<PropertyExecutiveHeader[\s\S]*?<PropertyExecutiveKpis[\s\S]*?<PropertySubNav/,
    );
    expect(layout).not.toMatch(/\bsticky\b|backdrop-blur|\btop-0\b/);
    expect(tabs).not.toMatch(/\bsticky\b/);
    expect(propertySubNavHref("property-1", "general")).toBe(
      "/propiedades/property-1",
    );
    expect(propertySubNavHref("property-1", "imagenes")).toBe(
      "/propiedades/property-1/imagenes",
    );
  });
});
