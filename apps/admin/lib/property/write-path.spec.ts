/* eslint-disable turbo/no-undeclared-env-vars */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { isValidElement, type ReactNode } from "react";
import { writeFileSync } from "node:fs";
import { detailProperty } from "./detail-context.fixture";
import type { AdminProperty } from "@/lib/api/types/property";

// Executes the actual form handlers, actions and HTTP serializers. Hooks and
// transport are controlled seams; this does not measure React/Next or network time.
const harness = vi.hoisted(() => ({
  states: [] as unknown[],
  cursor: 0,
  pending: undefined as Promise<void> | undefined,
  writes: [] as {
    path: string;
    method: string;
    body: Record<string, unknown>;
  }[],
  invalidations: [] as string[],
  refreshes: 0,
  property: {} as Record<string, unknown>,
  failMethod: null as string | null,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useState: (initial: unknown) => {
    const index = harness.cursor++;
    if (!(index in harness.states))
      harness.states[index] =
        typeof initial === "function" ? initial() : initial;
    return [
      harness.states[index],
      (value: unknown) => {
        harness.states[index] =
          typeof value === "function" ? value(harness.states[index]) : value;
      },
    ];
  },
  useTransition: () => [
    false,
    (callback: () => Promise<void>) => {
      harness.pending = callback();
    },
  ],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => harness.refreshes++, push: vi.fn() }),
}));
vi.mock("next/cache", () => ({
  revalidatePath: (path: string) => harness.invalidations.push(path),
}));
vi.mock("@repo/ui/toast", () => ({
  useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }),
}));
vi.mock("@/lib/api/client", () => ({
  ApiError: class extends Error {},
  apiFetch: async (path: string, options: { method: string; body: string }) => {
    const body = JSON.parse(options.body);
    harness.writes.push({ path, method: options.method, body });
    if (options.method === harness.failMethod)
      throw new Error("Fixture write failed");
    if (options.method === "PATCH") Object.assign(harness.property, body);
    return { ...harness.property };
  },
}));

import { PropertyForm } from "@/components/property/property-form";

const catalog = ["cochera-fija", "cochera-cubierta", "pileta"].map(
  (slug, i) => ({
    id: `feature-${i}`,
    slug,
    name: slug,
    category: "GENERAL" as const,
    isActive: true,
    sortOrder: i,
    createdAt: "",
    updatedAt: "",
  }),
);
const assignments = [catalog[0]!, catalog[2]!].map((feature) => ({
  featureId: feature.id,
  slug: feature.slug,
  name: feature.name,
  category: feature.category,
  value: feature.slug === "pileta" ? "Compartida" : null,
}));

function nodes(node: ReactNode): Record<string, unknown>[] {
  if (Array.isArray(node)) return node.flatMap(nodes);
  if (!isValidElement<{ children?: ReactNode }>(node)) return [];
  return [node.props, ...nodes(node.props.children)];
}

const reports: unknown[] = [];
describe("Property write path A–D", () => {
  beforeEach(() => {
    harness.states = [];
    harness.cursor = 0;
    harness.writes = [];
    harness.invalidations = [];
    harness.refreshes = 0;
    harness.failMethod = null;
  });
  it.each(["A-title", "B-geo", "C-attributes", "D-description"])(
    "%s",
    async (scenario) => {
      const property: AdminProperty = {
        ...detailProperty,
        propertyType:
          scenario.startsWith("C") || scenario.startsWith("D")
            ? "GARAGE"
            : "HOUSE",
        internalCode: "REF-1",
        assignedToId: "user-1",
        countryId: "country-1",
        provinceId: "province-1",
        localityId: "locality-1",
        neighborhoodId: "neighborhood-1",
        provinceName: "Province",
        localityName: "City",
        neighborhoodName: "Neighborhood",
        neighborhood: "Neighborhood",
        postalCode: "1000",
      };
      harness.property = { ...property };
      const render = () => {
        harness.cursor = 0;
        return PropertyForm({
          mode: "edit",
          property,
          featureCatalog: catalog,
          featureAssignments:
            property.propertyType === "GARAGE" ? assignments : [],
        });
      };
      let tree = render();
      if (scenario === "A-title" || scenario === "D-description") {
        const original =
          scenario === "A-title" ? property.title : property.description;
        const field = nodes(tree).find((props) => props.value === original)!;
        (field.onChange as (e: unknown) => void)({
          target: { value: "Updated text" },
        });
      } else if (scenario === "B-geo") {
        const field = nodes(tree).find(
          (props) =>
            typeof props.value === "object" &&
            props.value !== null &&
            "provinceId" in props.value,
        )!;
        (field.onChange as (value: unknown) => void)({
          provinceId: "province-2",
          provinceName: "Province 2",
          localityId: "locality-2",
          localityName: "City 2",
          neighborhoodId: "",
          neighborhoodName: "",
        });
      } else {
        const field = nodes(tree).filter(
          (props) => props.type === "checkbox",
        )[3]!;
        (field.onChange as (e: unknown) => void)({ target: { checked: true } });
      }
      tree = render();
      tree.props.onSubmit({ preventDefault() {} } as never);
      await harness.pending;
      expect(harness.writes[0]?.method).toBe("PATCH");
      expect(harness.writes[0]?.body).not.toHaveProperty("isActive");
      if (scenario === "A-title")
        expect(harness.property.title).toBe("Updated text");
      if (scenario === "D-description")
        expect(harness.property.description).toBe("Updated text");
      reports.push({
        scenario,
        initial: property,
        writes: harness.writes,
        fields: Object.keys(harness.writes[0]!.body).length,
        serverActions: harness.writes.length,
        invalidations: harness.invalidations,
        refreshes: harness.refreshes,
      });
      console.info(JSON.stringify(reports.at(-1)));
      // Optional artifact export; no application instrumentation or DB access.
      if (process.env.PROPERTY_WRITE_REPORT)
        writeFileSync(
          process.env.PROPERTY_WRITE_REPORT,
          JSON.stringify(reports, null, 2),
        );

      if (process.env.PROPERTY_WRITE_BASELINE === "1") return;
      const expectedFields = {
        "A-title": 1,
        "B-geo": 7,
        "C-attributes": 0,
        "D-description": 1,
      };
      expect(Object.keys(harness.writes[0]!.body)).toHaveLength(
        expectedFields[scenario as keyof typeof expectedFields],
      );
      expect(
        harness.writes.filter((write) => write.method === "PUT"),
      ).toHaveLength(scenario === "C-attributes" ? 1 : 0);
      expect(harness.refreshes).toBe(0);
      if (scenario === "C-attributes")
        expect(harness.writes[1]!.body).toEqual({
          features: [
            { featureId: "feature-2", value: "Compartida" },
            { featureId: "feature-0" },
            { featureId: "feature-1" },
          ],
        });

      // Same mounted form after save: new values remain visible, and a second save
      // must not re-send the previous changes or replace attributes again.
      tree = render();
      if (scenario === "A-title" || scenario === "D-description") {
        expect(
          nodes(tree).some((props) => props.value === "Updated text"),
        ).toBe(true);
      }
      harness.writes = [];
      tree.props.onSubmit({ preventDefault() {} } as never);
      await harness.pending;
      expect(harness.writes).toEqual([
        { path: "/properties/property-1", method: "PATCH", body: {} },
      ]);
    },
  );

  it("preserves the failed attribute draft and retries only the failed part", async () => {
    harness.property = { ...detailProperty };
    const property = {
      ...detailProperty,
      propertyType: "GARAGE" as const,
      provinceId: "province-1",
      localityId: "locality-1",
    };
    const render = () => {
      harness.cursor = 0;
      return PropertyForm({
        mode: "edit",
        property,
        featureCatalog: catalog,
        featureAssignments: assignments,
      });
    };
    let tree = render();
    const title = nodes(tree).find((props) => props.value === property.title)!;
    (title.onChange as (e: unknown) => void)({
      target: { value: "Persisted title" },
    });
    const checkbox = nodes(tree).filter(
      (props) => props.type === "checkbox",
    )[3]!;
    (checkbox.onChange as (e: unknown) => void)({ target: { checked: true } });
    harness.failMethod = "PUT";
    tree = render();
    tree.props.onSubmit({ preventDefault() {} } as never);
    await harness.pending;
    expect(harness.property.title).toBe("Persisted title");
    expect(harness.refreshes).toBe(0);
    harness.failMethod = null;
    harness.writes = [];
    tree = render();
    tree.props.onSubmit({ preventDefault() {} } as never);
    await harness.pending;
    expect(harness.writes[0]!.body).toEqual({});
    expect(harness.writes[1]!.method).toBe("PUT");
  });

  it("never attempts the PUT after a denied PATCH", async () => {
    const property = {
      ...detailProperty,
      propertyType: "GARAGE" as const,
      provinceId: "province-1",
      localityId: "locality-1",
    };
    const render = () => {
      harness.cursor = 0;
      return PropertyForm({
        mode: "edit",
        property,
        featureCatalog: catalog,
        featureAssignments: assignments,
      });
    };
    const checkbox = nodes(render()).filter(
      (props) => props.type === "checkbox",
    )[3]!;
    (checkbox.onChange as (e: unknown) => void)({ target: { checked: true } });
    harness.failMethod = "PATCH";
    render().props.onSubmit({ preventDefault() {} } as never);
    await harness.pending;
    expect(harness.writes).toHaveLength(1);
    expect(harness.invalidations).toHaveLength(0);
    expect(harness.refreshes).toBe(0);
  });
});
