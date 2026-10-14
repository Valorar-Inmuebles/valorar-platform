import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PropertyLocationEditor } from "@/components/property/property-location-editor";

describe("D1 server boundary", () => {
  it("renders the editor on the server without evaluating Leaflet or accessing window", () => {
    expect(typeof window).toBe("undefined");
    const html = renderToString(
      createElement(PropertyLocationEditor, {
        latitude: "-34.1234567",
        longitude: "-58.1234567",
        onConfirm: vi.fn(),
      }),
    );
    expect(html).toContain("Latitud");
    expect(html).toContain("-34.1234567");
    expect(html).toContain("Cargando mapa");
    expect(html).not.toContain("leaflet-container");
  });
});
