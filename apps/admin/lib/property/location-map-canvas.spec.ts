// @vitest-environment jsdom
import { act, createElement, StrictMode, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen } from "@testing-library/dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import L from "leaflet";
import { PropertyLocationMapCanvas } from "@/components/property/property-location-map-canvas";
import { LocationMapBoundary } from "@/components/property/property-location-map";

// Keep the actual Leaflet and React-Leaflet lifecycle and events. Only add a
// context probe; jsdom does not download image tiles or simulate touch geometry.
const probe = vi.hoisted(() => ({ map: null as L.Map | null }));
vi.mock("react-leaflet", async (original) => {
  const reactLeaflet = await original<typeof import("react-leaflet")>();
  function Probe() {
    probe.map = reactLeaflet.useMap();
    return null;
  }
  return {
    ...reactLeaflet,
    MapContainer: (props: ComponentProps<typeof reactLeaflet.MapContainer>) =>
      createElement(
        reactLeaflet.MapContainer,
        props,
        props.children,
        createElement(Probe),
      ),
  };
});
let root: Root;
const onSelect = vi.fn();
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  probe.map = null;
  onSelect.mockClear();
  const node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
function layers<T extends L.Layer>(type: new (...args: never[]) => T): T[] {
  const result: T[] = [];
  probe.map!.eachLayer((layer) => {
    if (layer instanceof type) result.push(layer);
  });
  return result;
}
async function render(position: [number, number] | null, disabled = false) {
  await act(async () =>
    root.render(
      createElement(
        StrictMode,
        null,
        createElement(PropertyLocationMapCanvas, {
          position,
          onSelect,
          disabled,
        }),
      ),
    ),
  );
}

describe("D1 actual Leaflet canvas lifecycle", () => {
  it("renders existing coordinates and a draggable marker, with OSM attribution and localized zoom", async () => {
    await render([-34.1234567, -58.1234567]);
    const marker = layers(L.Marker)[0]!;
    expect(marker.getLatLng()).toEqual(L.latLng(-34.1234567, -58.1234567));
    expect(marker.dragging?.enabled()).toBe(true);
    expect(probe.map!.getZoom()).toBe(15);
    expect(
      screen.getByRole("link", { name: "OpenStreetMap" }).getAttribute("href"),
    ).toBe("https://www.openstreetmap.org/copyright");
    expect(screen.getByTitle("Acercar")).toBeTruthy();
    expect(document.querySelector(".leaflet-container")?.className).toContain(
      "sm:h-80",
    );
    await act(async () => {
      marker.setLatLng([-35.7654321, -59.7654321]);
      marker.fire("dragend");
    });
    expect(onSelect).toHaveBeenCalledExactlyOnceWith([
      -35.7654321, -59.7654321,
    ]);
  });
  it("has no marker until selection, handles map clicks and blocks writes when disabled", async () => {
    await render(null);
    expect(layers(L.Marker)).toHaveLength(0);
    expect(probe.map!.getZoom()).toBe(4);
    expect(onSelect).not.toHaveBeenCalled();
    await act(async () =>
      probe.map!.fire("click", { latlng: L.latLng(-34, 302) }),
    );
    expect(onSelect).toHaveBeenLastCalledWith([-34, -58]);
    await render([-34, -58], true);
    expect(layers(L.Marker)[0]!.dragging?.enabled()).toBe(false);
    await act(async () =>
      probe.map!.fire("click", { latlng: L.latLng(-35, -59) }),
    );
    await act(async () => layers(L.Marker)[0]!.fire("dragend"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
  it("re-centers on confirmed or cancelled draft changes without recreating the map", async () => {
    await render([-34, -58]);
    const initialMap = probe.map;
    await render([-35.1234567, -59.1234567]);
    expect(probe.map).toBe(initialMap);
    expect(probe.map!.getCenter().lat).toBeCloseTo(-35.1234567, 7);
    await render([-34, -58]);
    expect(probe.map!.getCenter().lat).toBe(-34);
    expect(onSelect).not.toHaveBeenCalled();
  });
  it("reports tile failures, retries only on action, and retains the marker", async () => {
    await render([-34, -58]);
    const tile = layers(L.TileLayer)[0]!;
    await act(async () => tile.fire("tileerror"));
    expect(screen.getByRole("alert").textContent).toContain("cartografía");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "Reintentar mapa" })),
    );
    expect(screen.queryByRole("alert")).toBeNull();
    const replacement = layers(L.TileLayer)[0]!;
    expect(replacement).not.toBe(tile);
    await act(async () => replacement.fire("load"));
    expect(screen.queryByText("Cargando cartografía…")).toBeNull();
    expect(layers(L.Marker)).toHaveLength(1);
    expect(onSelect).not.toHaveBeenCalled();
  });
  it("contains canvas/runtime errors without taking down the manual editor", async () => {
    function BrokenCanvas(): never {
      throw new Error("Chunk could not load");
    }
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    try {
      await act(async () =>
        root.render(
          createElement(LocationMapBoundary, null, createElement(BrokenCanvas)),
        ),
      );
      expect(screen.getByRole("alert").textContent).toContain("manualmente");
    } finally {
      consoleError.mockRestore();
    }
  });
});
