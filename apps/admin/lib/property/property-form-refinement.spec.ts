// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@repo/ui/toast";
import { PropertyForm } from "@/components/property/property-form";
import { detailProperty } from "./detail-context.fixture";

const actions = vi.hoisted(() => ({
  createPropertyAction: vi.fn(),
  updatePropertyAction: vi.fn(),
}));
vi.mock("@/lib/api/property-actions", () => actions);
vi.mock("@/lib/api/property-feature-actions", () => ({
  replacePropertyFeatureAssignmentsAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href }, children),
}));
// Catalog loading is covered separately by GEO tests, not relevant to input interactions.
vi.mock("@/components/property/property-location-fields", () => ({
  PropertyLocationFields: () => null,
}));
// Leaflet is exercised by location-map-canvas.spec; keep this suite on the form boundary.
vi.mock("@/components/property/property-location-map", () => ({
  PropertyLocationMap: () => null,
}));
let root: Root;
const property = {
  ...detailProperty,
  provinceId: "province",
  localityId: "locality",
  totalArea: 80.4,
  latitude: -34.1234567,
  longitude: -58.1234567,
  internalCode: "REF-1",
  createdBy: {
    id: "author",
    name: "Ana",
    email: "ana@example.test",
    isActive: true,
  },
};
const input = (label: string) =>
  screen.getByLabelText(new RegExp(`^${label}`), {
    selector: "input",
  }) as HTMLInputElement;
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  actions.createPropertyAction
    .mockReset()
    .mockResolvedValue({ ok: true, id: "created" });
  actions.updatePropertyAction.mockReset().mockResolvedValue({ ok: true });
  const node = document.createElement("div");
  document.body.append(node);
  root = createRoot(node);
  await act(async () =>
    root.render(
      createElement(
        ToastProvider,
        null,
        createElement(PropertyForm, {
          mode: "edit",
          property,
          assignableUsers: [{ id: "author", name: "Ana" }],
        }),
      ),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});
async function submit() {
  await act(async () => fireEvent.submit(input("Título").closest("form")!));
}

describe("Property form refinement", () => {
  it("does not save a coordinate draft; confirmed changes are differential and preserve postal/GEO/slug", async () => {
    const latitude = input("Latitud");
    await act(async () =>
      fireEvent.change(latitude, { target: { value: "-35.1234567" } }),
    );
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenLastCalledWith(
      property.id,
      {},
    );
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Confirmar ubicación" }),
      ),
    );
    expect(actions.updatePropertyAction).toHaveBeenCalledTimes(1);
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenLastCalledWith(property.id, {
      latitude: -35.1234567,
    });
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenLastCalledWith(
      property.id,
      {},
    );
  });
  it("keeps confirmed coordinates available after a failed save", async () => {
    actions.updatePropertyAction.mockResolvedValue({
      ok: false,
      error: "No se pudo guardar",
    });
    await act(async () =>
      fireEvent.change(input("Longitud"), { target: { value: "-59.7654321" } }),
    );
    await act(async () =>
      fireEvent.click(
        screen.getByRole("button", { name: "Confirmar ubicación" }),
      ),
    );
    await submit();
    expect(input("Longitud").value).toBe("-59.7654321");
    actions.updatePropertyAction.mockResolvedValue({ ok: true });
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenLastCalledWith(property.id, {
      longitude: -59.7654321,
    });
  });
  it("keeps persisted slug readonly while editing title and PATCHes only title", async () => {
    const user = userEvent.setup();
    expect(input("Slug").readOnly).toBe(true);
    await act(async () => {
      await user.clear(input("Título"));
      await user.type(input("Título"), "Nuevo título");
    });
    expect(input("Slug").value).toBe(property.slug);
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenCalledWith(property.id, {
      title: "Nuevo título",
    });
  });
  it("updates the local slug preview from title in create mode without network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await act(async () =>
      root.render(
        createElement(
          ToastProvider,
          null,
          createElement(PropertyForm, { key: "create", mode: "create" }),
        ),
      ),
    );
    const user = userEvent.setup();
    await act(async () => user.type(input("Título"), "Ático en Córdoba"));
    expect(input("Slug").value).toBe("atico-en-cordoba");
    expect(input("Slug").readOnly).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(actions.createPropertyAction).not.toHaveBeenCalled();
  });
  it("copies exact visible slug and internal code with accessible feedback, without submitting", async () => {
    const user = userEvent.setup();
    const write = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    await act(async () =>
      user.click(screen.getByRole("button", { name: "Copiar slug" })),
    );
    expect(write).toHaveBeenLastCalledWith(property.slug);
    expect(
      screen
        .getAllByRole("status")
        .some((node) => node.textContent?.includes("Copiado")),
    ).toBe(true);
    await act(async () => {
      await user.clear(input("Código interno"));
      await user.type(input("Código interno"), "REF-2");
      await user.click(
        screen.getByRole("button", { name: "Copiar código interno" }),
      );
    });
    expect(write).toHaveBeenLastCalledWith("REF-2");
    expect(input("Código interno").value).toBe("REF-2");
    expect(actions.updatePropertyAction).not.toHaveBeenCalled();
    write.mockRestore();
  });
  it("reports clipboard failure without changing data", async () => {
    const user = userEvent.setup();
    const write = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockRejectedValue(new Error("denied"));
    await act(async () =>
      user.click(screen.getByRole("button", { name: "Copiar slug" })),
    );
    expect(screen.getByText(/No se pudo copiar/)).toBeTruthy();
    expect(input("Slug").value).toBe(property.slug);
    write.mockRestore();
  });
  it("allows integer paste/clear, rejects invalid paste without silently changing the number", async () => {
    const user = userEvent.setup();
    const rooms = input("Ambientes");
    expect(rooms.inputMode).toBe("numeric");
    await act(async () => {
      await user.click(rooms);
      await user.paste("12");
    });
    expect(rooms.value).toBe("12");
    await act(async () => {
      await user.clear(rooms);
      await user.paste("1e2");
    });
    expect(rooms.value).toBe("");
    await act(async () => user.paste("-1"));
    expect(rooms.value).toBe("");
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenCalledWith(property.id, {});
  });
  it("accepts dot/comma decimals and keeps scale and differential persistence", async () => {
    const user = userEvent.setup();
    const area = input("Superficie total");
    expect(area.value).toBe("80,4");
    expect(area.inputMode).toBe("decimal");
    await act(async () => {
      await user.clear(area);
      await user.paste("35.79");
    });
    expect(area.value).toBe("35,79");
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenLastCalledWith(property.id, {
      totalArea: 35.79,
    });
    await act(async () => {
      await user.clear(area);
      await user.paste("35,790");
    });
    expect(area.value).toBe("");
    await act(async () => user.type(area, "35,"));
    expect(area.value).toBe("35,");
  });
  it("validates calendar years and leaves floor/street number textual", async () => {
    const user = userEvent.setup();
    const year = input("Año de construcción");
    expect(year.maxLength).toBe(4);
    expect(year.inputMode).toBe("numeric");
    await act(async () => user.type(year, "180"));
    await submit();
    expect(screen.getByRole("alert").textContent).toContain("1800 y 2100");
    expect(actions.updatePropertyAction).not.toHaveBeenCalled();
    await act(async () => {
      await user.clear(year);
      await user.type(year, "2000");
      await user.type(input("Piso"), "PB");
    });
    await submit();
    expect(actions.updatePropertyAction).toHaveBeenCalledWith(property.id, {
      floor: "PB",
      yearBuilt: 2000,
    });
  });
  it.each([390, 1440])(
    "preserves field order and the separate responsive responsible card (%s structural)",
    (width) => {
      vi.stubGlobal("innerWidth", width);
      const titles = screen.getAllByRole("heading", { level: 2 });
      expect(titles.slice(0, 3).map((node) => node.textContent)).toEqual([
        "Identificación",
        "Responsables",
        "Ubicación",
      ]);
      const identification = titles[0]!.parentElement!.parentElement!;
      const labels = [...identification.querySelectorAll("label")].map((node) =>
        node.textContent?.replace("*", ""),
      );
      expect(labels).toEqual([
        "Título",
        "Slug",
        "Tipo",
        "Código interno",
        "Condición",
      ]);
      const responsible = titles[1]!.parentElement!.parentElement!;
      expect(responsible.textContent).toContain("ana@example.test");
      expect(responsible.querySelector(".md\\:grid-cols-2")).not.toBeNull();
      expect(identification.textContent).not.toContain("Creada por");
      expect(input("Slug").className).toContain("pr-12");
    },
  );
});
