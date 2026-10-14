// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RentalConceptManager } from "@/components/rental/rental-concept-manager";
import { ToastProvider } from "@repo/ui/toast";

const actions = vi.hoisted(() => ({
  createRentalConceptAction: vi.fn(),
  setRentalConceptActiveAction: vi.fn(),
}));
vi.mock("@/lib/api/rental-actions", () => actions);

let root: Root;
const concept = {
  id: "concept-test",
  tenantId: "tenant-test",
  name: "Internet",
  slug: "internet",
  systemCode: null,
  isActive: true,
  sortOrder: 1000,
  createdAt: "2026-10-13T00:00:00Z",
  updatedAt: "2026-10-13T00:00:00Z",
};
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  actions.createRentalConceptAction.mockReset();
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root.render(
      createElement(
        ToastProvider,
        null,
        createElement(RentalConceptManager, { initialConcepts: [] }),
      ),
    ),
  );
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("concept creation using coordinated SidePanel", () => {
  it("prevents repeated submissions, updates the list and restores focus after success", async () => {
    let resolve!: (result: unknown) => void;
    actions.createRentalConceptAction.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    const user = userEvent.setup();
    const trigger = screen.getByText("Agregar concepto");
    await act(async () => user.click(trigger));
    await act(async () =>
      user.type(screen.getByLabelText(/Nombre/), "Internet"),
    );
    const form = screen.getByRole("dialog").querySelector("form")!;
    await act(async () => {
      fireEvent.submit(form);
      fireEvent.submit(form);
    });
    expect(actions.createRentalConceptAction).toHaveBeenCalledTimes(1);
    expect(actions.createRentalConceptAction).toHaveBeenCalledWith({
      name: "Internet",
      slug: "internet",
    });
    await act(async () => user.keyboard("{Escape}"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await act(async () => resolve({ ok: true, value: concept }));
    await act(async () => new Promise((done) => setTimeout(done, 240)));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Internet")).toBeTruthy();
    expect(screen.queryByText("internet")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(screen.getByRole("status").textContent).toContain(
      "Concepto personalizado creado.",
    );
  });

  it("keeps values and accessible feedback on failure and restores focus on Cancel", async () => {
    actions.createRentalConceptAction.mockResolvedValue({
      ok: false,
      error: "El concepto ya existe.",
    });
    const user = userEvent.setup();
    const trigger = screen.getByText("Agregar concepto");
    await act(async () => user.click(trigger));
    await act(async () =>
      user.type(screen.getByLabelText(/Nombre/), "Internet"),
    );
    await act(async () => user.click(screen.getByText("Crear concepto")));
    const dialog = screen.getByRole("dialog");
    expect((screen.getByLabelText(/Nombre/) as HTMLInputElement).value).toBe(
      "Internet",
    );
    expect((screen.getByLabelText(/Slug/) as HTMLInputElement).value).toBe(
      "internet",
    );
    expect(screen.getByRole("status").textContent).toContain(
      "El concepto ya existe.",
    );
    expect(screen.getByRole("status").closest("[inert]")).toBeNull();
    await act(async () => user.click(within(dialog).getByText("Cancelar")));
    await act(async () => new Promise((done) => setTimeout(done, 240)));
    expect(document.activeElement).toBe(trigger);
  });
});
