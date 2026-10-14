// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PropertyLocationEditor } from "@/components/property/property-location-editor";
import type { LocationMapProps } from "@/components/property/property-location-map";
import type { CoordinateValues } from "./location-map";

const map = vi.hoisted(() => ({ props: null as LocationMapProps | null }));
vi.mock("@/components/property/property-location-map", () => ({
  PropertyLocationMap: (props: LocationMapProps) => {
    map.props = props;
    return null;
  },
}));
let root: Root;
const confirmed = vi.fn();
const original = { latitude: "-34.1234567", longitude: "-58.1234567" };
function Harness({
  initial = original,
  disabled = false,
}: {
  initial?: CoordinateValues;
  disabled?: boolean;
}) {
  const [values, setValues] = useState(initial);
  return createElement(PropertyLocationEditor, {
    ...values,
    disabled,
    onConfirm: (next) => {
      confirmed(next);
      setValues(next);
    },
  });
}
const input = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
async function change(name: string, value: string) {
  await act(async () => fireEvent.change(input(name), { target: { value } }));
}
async function click(name: string) {
  await act(async () => fireEvent.click(screen.getByRole("button", { name })));
}
beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  confirmed.mockClear();
  const node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("D1 draft confirmation", () => {
  it("supports confirmation by keyboard without pointer or map interaction", async () => {
    await act(async () => root.render(createElement(Harness)));
    const user = userEvent.setup();
    await act(async () => {
      input("Latitud").focus();
      await user.clear(input("Latitud"));
      await user.type(input("Latitud"), "-35.1234567");
      await user.tab();
      await user.tab();
      await user.tab();
    });
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Confirmar ubicación" }),
    );
    await act(async () => user.keyboard("{Enter}"));
    expect(confirmed).toHaveBeenCalledExactlyOnceWith({
      latitude: "-35.1234567",
      longitude: "-58.1234567",
    });
  });
  it("shows the existing point without triggering a confirmation or a write", async () => {
    await act(async () => root.render(createElement(Harness)));
    expect(map.props?.position).toEqual([-34.1234567, -58.1234567]);
    expect(input("Latitud").value).toBe(original.latitude);
    expect(confirmed).not.toHaveBeenCalled();
    expect(
      (
        screen.getByRole("button", {
          name: "Confirmar ubicación",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });
  it("does not select the reference center for a property without coordinates", async () => {
    await act(async () =>
      root.render(
        createElement(Harness, { initial: { latitude: "", longitude: "" } }),
      ),
    );
    expect(map.props?.position).toBeNull();
    expect(screen.getByText(/vista inicial muestra Argentina/)).toBeTruthy();
    expect(confirmed).not.toHaveBeenCalled();
    await act(async () => map.props!.onSelect([-35.123456789, -59.123456789]));
    expect(input("Latitud").value).toBe("-35.1234568");
    expect(confirmed).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toContain(
      "pendiente de confirmar",
    );
    await click("Confirmar ubicación");
    expect(confirmed).toHaveBeenCalledExactlyOnceWith({
      latitude: "-35.1234568",
      longitude: "-59.1234568",
    });
    expect(screen.getByRole("status").textContent).toContain(
      "confirmada en el formulario",
    );
  });
  it("cancel restores the last confirmed form point; unmount drops unconfirmed edits", async () => {
    await act(async () => root.render(createElement(Harness)));
    await act(async () => map.props!.onSelect([-35, -59]));
    await click("Cancelar ajuste");
    expect(map.props?.position).toEqual([-34.1234567, -58.1234567]);
    expect(confirmed).not.toHaveBeenCalled();
    await change("Latitud", "-36");
    await click("Confirmar ubicación");
    await change("Latitud", "-37");
    await click("Cancelar ajuste");
    expect(input("Latitud").value).toBe("-36.0000000");
    await change("Latitud", "-38");
    await act(async () => root.render(null));
    expect(confirmed).toHaveBeenCalledTimes(1);
  });
  it("manual entry supports signed commas, rejects incomplete/out-of-range values and associates errors", async () => {
    await act(async () => root.render(createElement(Harness)));
    await change("Latitud", "-91");
    await click("Confirmar ubicación");
    const alert = screen.getByRole("alert");
    expect(input("Latitud").getAttribute("aria-describedby")).toContain(
      alert.id,
    );
    expect(input("Latitud").getAttribute("aria-invalid")).toBe("true");
    expect(confirmed).not.toHaveBeenCalled();
    await change("Latitud", "");
    await click("Confirmar ubicación");
    expect(confirmed).not.toHaveBeenCalled();
    await change("Latitud", "-35,7654321");
    await click("Confirmar ubicación");
    expect(confirmed).toHaveBeenCalledExactlyOnceWith({
      latitude: "-35.7654321",
      longitude: "-58.1234567",
    });
  });
  it("disables edits, map selection and confirmation during submit", async () => {
    await act(async () =>
      root.render(createElement(Harness, { disabled: true })),
    );
    expect(input("Latitud").disabled).toBe(true);
    expect(map.props?.disabled).toBe(true);
    await click("Confirmar ubicación");
    expect(confirmed).not.toHaveBeenCalled();
  });
  it.each([390, 1440])(
    "retains labeled manual alternatives and responsive layout at %s (structural)",
    async (width) => {
      vi.stubGlobal("innerWidth", width);
      await act(async () => root.render(createElement(Harness)));
      expect(
        screen.getByRole("region", { name: "Ubicación en el mapa" }),
      ).toBeTruthy();
      expect(input("Latitud").inputMode).toBe("decimal");
      expect(document.querySelector(".sm\\:grid-cols-2")).not.toBeNull();
      expect(
        screen
          .getByRole("button", { name: "Confirmar ubicación" })
          .getAttribute("type"),
      ).toBe("button");
    },
  );
});
