// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PropertyLocationEditor } from "@/components/property/property-location-editor";
import type { PropertyLocationSearchPayload } from "@/lib/api/types/property-location-search";
import type { LocationMapProps } from "@/components/property/property-location-map";

const state = vi.hoisted(() => ({
  map: null as LocationMapProps | null,
  search: vi.fn(),
}));
vi.mock("@/components/property/property-location-map", () => ({
  PropertyLocationMap: (props: LocationMapProps) => {
    state.map = props;
    return null;
  },
}));
vi.mock("@/lib/api/property-location-search-actions", () => ({
  searchPropertyLocationAction: state.search,
}));
const address: PropertyLocationSearchPayload = {
  street: "Santa Fe",
  streetNumber: "123",
  provinceId: "p",
  localityId: "l",
  country: "AR",
};
const result = {
  ok: true as const,
  result: {
    status: "RESULTS" as const,
    candidates: [
      {
        label: "Santa Fe 123, Rosario",
        latitude: -32.12345678,
        longitude: -60.76543219,
        granularity: "ADDRESS" as const,
        warnings: [],
      },
      {
        label: "Santa Fe, Rosario",
        latitude: -32.22,
        longitude: -60.66,
        granularity: "STREET" as const,
        warnings: ["Verificá la altura."],
      },
    ],
  },
};
let root: Root;
const confirm = vi.fn();
function Harness({
  propertyId,
  input = address,
}: {
  propertyId?: string;
  input?: PropertyLocationSearchPayload;
}) {
  const [coords, setCoords] = useState({
    latitude: "-34.1234567",
    longitude: "-58.1234567",
  });
  return createElement(PropertyLocationEditor, {
    ...coords,
    propertyId,
    address: input,
    onConfirm: (values) => {
      confirm(values);
      setCoords(values);
    },
  });
}
const click = async (name: RegExp | string) => {
  await act(async () => fireEvent.click(screen.getByRole("button", { name })));
};
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  state.search.mockReset().mockResolvedValue(result);
  confirm.mockClear();
  const node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  await act(async () => root.render(createElement(Harness)));
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("D2 explicit search and manual draft", () => {
  it("never searches on render or typing; shows multiple candidates and confirms only selected coordinates", async () => {
    expect(state.search).not.toHaveBeenCalled();
    await click("Buscar ubicación");
    expect(state.search).toHaveBeenCalledExactlyOnceWith(address, undefined);
    expect(screen.getByText("Santa Fe 123, Rosario")).toBeTruthy();
    expect(screen.getByText("Santa Fe, Rosario")).toBeTruthy();
    expect(state.map?.position).toEqual([-34.1234567, -58.1234567]);
    await click(/Santa Fe 123, Rosario/);
    expect(state.map?.position).toEqual([-32.1234568, -60.7654322]);
    expect(confirm).not.toHaveBeenCalled();
    await click("Confirmar ubicación");
    expect(confirm).toHaveBeenCalledExactlyOnceWith({
      latitude: "-32.1234568",
      longitude: "-60.7654322",
    });
    expect(state.search).toHaveBeenCalledTimes(1);
  });
  it("preserves manual marker and confirmed point when search fails or returns empty", async () => {
    await act(async () => state.map!.onSelect([-35, -59]));
    state.search.mockResolvedValueOnce({ ok: false, error: "No disponible" });
    await click("Buscar ubicación");
    expect(screen.getByRole("alert").textContent).toContain("No disponible");
    expect(state.map?.position).toEqual([-35, -59]);
    state.search.mockResolvedValueOnce({
      ok: true,
      result: { status: "NO_RESULTS", candidates: [] },
    });
    await click("Buscar ubicación");
    expect(screen.getByText(/No encontramos una ubicación/)).toBeTruthy();
    expect(state.map?.position).toEqual([-35, -59]);
    expect(confirm).not.toHaveBeenCalled();
  });
  it("discards an obsolete result after the address changes", async () => {
    let settle!: (value: typeof result) => void;
    state.search.mockReturnValueOnce(
      new Promise((resolve) => {
        settle = resolve;
      }),
    );
    await click("Buscar ubicación");
    await act(async () =>
      root.render(
        createElement(Harness, { input: { ...address, street: "Otra calle" } }),
      ),
    );
    await act(async () => settle(result));
    expect(screen.queryByText("Santa Fe 123, Rosario")).toBeNull();
    expect(state.map?.position).toEqual([-34.1234567, -58.1234567]);
    await click("Buscar ubicación");
    expect(state.search).toHaveBeenLastCalledWith(
      { ...address, street: "Otra calle" },
      undefined,
    );
  });
  it("passes property id on edit and displays rate-limit wait without changing coordinates", async () => {
    await act(async () =>
      root.render(createElement(Harness, { propertyId: "property-1" })),
    );
    state.search.mockResolvedValueOnce({
      ok: false,
      error: "Demasiadas búsquedas.",
      retryAfterSeconds: 12,
    });
    await click("Buscar ubicación");
    expect(state.search).toHaveBeenCalledWith(address, "property-1");
    expect(screen.getByRole("alert").textContent).toContain("12 segundos");
    expect(state.map?.position).toEqual([-34.1234567, -58.1234567]);
  });
  it.each([390, 1440])(
    "keeps search and suggested results accessible at %s (structural)",
    async (width) => {
      vi.stubGlobal("innerWidth", width);
      await click("Buscar ubicación");
      expect(
        screen
          .getByRole("button", { name: /Santa Fe 123, Rosario/ })
          .getAttribute("type"),
      ).toBe("button");
      expect(
        screen
          .getByRole("button", { name: "Buscar ubicación" })
          .getAttribute("type"),
      ).toBe("button");
      expect(
        screen.getByText("Geoapify").closest("a")?.getAttribute("href"),
      ).toBe("https://www.geoapify.com/");
      expect(confirm).not.toHaveBeenCalled();
    },
  );
});
