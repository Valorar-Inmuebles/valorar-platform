// @vitest-environment jsdom
import {
  act,
  createElement,
  useEffect,
  useState,
  type ComponentType,
} from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { PropertyLocationEditor } from "@/components/property/property-location-editor";
import type { LocationMapProps } from "@/components/property/property-location-map";

// The standalone Next loader requires Admin's nested React instead of Vitest's
// canonical React alias. Model only that boundary; import and mount the actual
// canvas. Node SSR is tested separately with the unmocked Next loader.
const loaderState = vi.hoisted(() => ({
  pending: null as Promise<void> | null,
}));
vi.mock("next/dynamic", () => ({
  default: (
    load: () => Promise<ComponentType<LocationMapProps>>,
    options: { ssr: boolean; loading: ComponentType<{ error?: Error }> },
  ) => {
    expect(options.ssr).toBe(false);
    return function ClientBoundary(props: LocationMapProps) {
      const [Canvas, setCanvas] =
        useState<ComponentType<LocationMapProps> | null>(null);
      useEffect(() => {
        loaderState.pending = load().then((component) => {
          setCanvas(() => component);
        });
      }, []);
      return Canvas
        ? createElement(Canvas, props)
        : createElement(options.loading);
    };
  },
}));

it("hydrates the initial editor markup and loads one client canvas without losing coordinate precision", async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  const onConfirm = vi.fn();
  const recoverable = vi.fn();
  const node = document.createElement("div");
  document.body.append(node);
  const element = createElement(PropertyLocationEditor, {
    latitude: "-34.1234567",
    longitude: "-58.1234567",
    onConfirm,
  });
  node.innerHTML = renderToString(element);
  expect(node.querySelector(".leaflet-container")).toBeNull();
  let root: Root | undefined;
  try {
    await act(async () => {
      root = hydrateRoot(node, element, { onRecoverableError: recoverable });
    });
    await act(async () => {
      await loaderState.pending;
    });
    expect(node.querySelectorAll(".leaflet-container")).toHaveLength(1);
    expect(recoverable).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
    expect((node.querySelector("input") as HTMLInputElement).value).toBe(
      "-34.1234567",
    );
  } finally {
    await act(async () => root?.unmount());
    node.remove();
    vi.unstubAllGlobals();
  }
});
