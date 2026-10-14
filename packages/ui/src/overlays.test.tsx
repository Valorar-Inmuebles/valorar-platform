// @vitest-environment jsdom
import { act, StrictMode, useState, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SidePanel,
  SidePanelContent,
  SidePanelDescription,
  SidePanelFooter,
  SidePanelHeader,
  SidePanelTitle,
} from "./side-panel";
import { ConfirmModal, Modal, ModalTitle } from "./modal";
import { Select } from "./select";
import { DatePicker } from "./date-picker";
import { DropdownMenu } from "./dropdown-menu";
import { SearchCombobox } from "./search-combobox";
import { ErrorMessage, FormField, Label } from "./form-field";
import { Input } from "./input";
import { ToastProvider, useToast } from "./toast";

let root: Root;
let container: HTMLDivElement;
let user: ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  user = userEvent.setup();
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  document.body.style.overflow = "";
  vi.unstubAllGlobals();
});

async function render(node: ReactNode) {
  await act(async () => root.render(node));
}
async function click(node: Element) {
  await act(async () => user.click(node));
}
async function key(value: string) {
  await act(async () => user.keyboard(value));
}
async function tab(shift = false) {
  await act(async () => user.tab({ shift }));
}
async function finishExit() {
  await act(async () => new Promise((resolve) => setTimeout(resolve, 240)));
}

function Panel({
  children,
  closeOnOverlay = true,
  rejectClose = false,
}: {
  children?: ReactNode;
  closeOnOverlay?: boolean;
  rejectClose?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Abrir panel</button>
      <button>Fondo</button>
      <SidePanel
        open={open}
        onClose={() => {
          if (!rejectClose) setOpen(false);
        }}
        closeOnOverlay={closeOnOverlay}
      >
        <SidePanelHeader>
          <SidePanelTitle>Panel de prueba</SidePanelTitle>
          <SidePanelDescription>Descripción del panel</SidePanelDescription>
        </SidePanelHeader>
        <SidePanelContent>
          {children ?? <input aria-label="Nombre" />}
        </SidePanelContent>
        <SidePanelFooter>
          <button onClick={() => setOpen(false)}>Cancelar panel</button>
        </SidePanelFooter>
      </SidePanel>
    </>
  );
}

describe("coordinated modal overlays (DOM)", () => {
  it("focuses inside, cycles Tab/Shift+Tab, isolates the background and restores the trigger after exit", async () => {
    document.body.style.overflow = "scroll";
    await render(
      <StrictMode>
        <Panel />
      </StrictMode>,
    );
    const trigger = screen.getByText("Abrir panel");
    await click(trigger);
    const dialog = screen.getByRole("dialog", { name: "Panel de prueba" });
    expect(document.activeElement).toBe(
      within(dialog).getByLabelText("Cerrar"),
    );
    expect(dialog.getAttribute("aria-describedby")).toBe(
      within(dialog).getByText("Descripción del panel").id,
    );
    expect(container.hasAttribute("inert")).toBe(true);
    expect(container.getAttribute("aria-hidden")).toBe("true");
    expect(document.body.style.overflow).toBe("hidden");
    await tab(true);
    expect(document.activeElement).toBe(screen.getByText("Cancelar panel"));
    await tab();
    expect(document.activeElement).toBe(
      within(dialog).getByLabelText("Cerrar"),
    );
    await tab();
    expect(document.activeElement).toBe(screen.getByLabelText("Nombre"));
    await act(async () => trigger.focus()); // jsdom does not implement inert; focus guard still enforces it.
    expect(dialog.contains(document.activeElement)).toBe(true);
    await key("{Escape}");
    expect(document.body.style.overflow).toBe("hidden");
    await finishExit();
    expect(document.activeElement).toBe(trigger);
    expect(container.hasAttribute("inert")).toBe(false);
    expect(container.hasAttribute("aria-hidden")).toBe(false);
    expect(document.body.style.overflow).toBe("scroll");
  });

  it("closes from the header and supports conditional unmount", async () => {
    function Conditional() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Detalle</button>
          {open ? (
            <SidePanel open onClose={() => setOpen(false)}>
              <SidePanelHeader>
                <SidePanelTitle>Detalle abierto</SidePanelTitle>
              </SidePanelHeader>
            </SidePanel>
          ) : null}
        </>
      );
    }
    await render(<Conditional />);
    const trigger = screen.getByText("Detalle");
    await click(trigger);
    await click(screen.getByLabelText("Cerrar"));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("");
  });

  it("uses an empty dialog as fallback and omits nonexistent ARIA descriptions", async () => {
    await render(
      <SidePanel open onClose={() => {}}>
        <SidePanelTitle>Lectura</SidePanelTitle>
      </SidePanel>,
    );
    const dialog = screen.getByRole("dialog", { name: "Lectura" });
    expect(dialog.hasAttribute("aria-describedby")).toBe(false);
    expect(document.activeElement).toBe(dialog);
    await tab();
    expect(document.activeElement).toBe(dialog);
    await tab(true);
    expect(document.activeElement).toBe(dialog);
  });

  it("skips disabled and hidden initial controls", async () => {
    await render(
      <Modal open onClose={() => {}}>
        <ModalTitle>Controles</ModalTitle>
        <button disabled>Deshabilitado</button>
        <button hidden>Oculto</button>
        <button style={{ display: "none" }}>Invisible</button>
        <input aria-label="Disponible" />
      </Modal>,
    );
    expect(document.activeElement).toBe(screen.getByLabelText("Disponible"));
  });

  it("only closes the upper ConfirmModal and keeps scroll locked and focus in the parent", async () => {
    function Confirmation() {
      const [confirm, setConfirm] = useState(false);
      return (
        <>
          <button onClick={() => setConfirm(true)}>Confirmar operación</button>
          <ConfirmModal
            open={confirm}
            onClose={() => setConfirm(false)}
            onConfirm={() => setConfirm(false)}
            title="Confirmación"
            description="Revisá los datos"
          />
        </>
      );
    }
    await render(
      <Panel>
        <Confirmation />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    const parent = screen.getByRole("dialog");
    const trigger = screen.getByText("Confirmar operación");
    await click(trigger);
    const confirmation = screen.getByRole("dialog", { name: "Confirmación" });
    expect(confirmation.contains(document.activeElement)).toBe(true);
    expect(parent.closest("[inert]")).not.toBeNull();
    expect(confirmation.getAttribute("aria-describedby")).toBe(
      within(confirmation).getByText("Revisá los datos").id,
    );
    await tab();
    expect(document.activeElement).toBe(
      within(confirmation).getByLabelText("Cerrar"),
    );
    await key("{Escape}");
    await finishExit();
    expect(screen.queryByRole("dialog", { name: "Confirmación" })).toBeNull();
    expect(screen.getByRole("dialog")).toBe(parent);
    expect(document.activeElement).toBe(trigger);
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("supports sibling-portaled SidePanels such as commercialization and price", async () => {
    await render(
      <Panel>
        <Panel />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    const parent = screen.getByRole("dialog");
    const nestedTrigger = within(parent).getByText("Abrir panel");
    await click(nestedTrigger);
    const child = screen.getByRole("dialog");
    expect(child).not.toBe(parent);
    await key("{Escape}");
    await finishExit();
    expect(screen.getByRole("dialog")).toBe(parent);
    expect(document.activeElement).toBe(nestedTrigger);
  });

  it("respects controlled refusal to close and closeOnOverlay", async () => {
    await render(<Panel rejectClose closeOnOverlay={false} />);
    await click(screen.getByText("Abrir panel"));
    await key("{Escape}");
    const dialog = screen.getByRole("dialog");
    await click(dialog.previousElementSibling!);
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(dialog.contains(document.activeElement)).toBe(true);
    await click(screen.getByLabelText("Cerrar"));
    expect(screen.getByRole("dialog")).toBe(dialog);
  });

  it("closes on backdrop click and restores focus", async () => {
    await render(<Panel />);
    const trigger = screen.getByText("Abrir panel");
    await click(trigger);
    await click(screen.getByRole("dialog").previousElementSibling!);
    await finishExit();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it("preserves explicit autoFocus and lets a descendant consume Escape", async () => {
    const close = vi.fn();
    await render(
      <SidePanel open onClose={close}>
        <SidePanelTitle>Edición</SidePanelTitle>
        <input
          autoFocus
          aria-label="Foco explícito"
          onKeyDown={(event) => {
            if (event.key === "Escape") event.preventDefault();
          }}
        />
      </SidePanel>,
    );
    expect(document.activeElement).toBe(
      screen.getByLabelText("Foco explícito"),
    );
    await key("{Escape}");
    expect(close).not.toHaveBeenCalled();
  });

  it("uses updated close callbacks without resetting focus on every render", async () => {
    const close = vi.fn();
    function UpdatedCallback() {
      const [dirty, setDirty] = useState(false);
      return (
        <SidePanel open onClose={() => close(dirty)}>
          <SidePanelTitle>Formulario</SidePanelTitle>
          <input aria-label="Campo editable" onChange={() => setDirty(true)} />
        </SidePanel>
      );
    }
    await render(<UpdatedCallback />);
    const input = screen.getByLabelText("Campo editable");
    await act(async () => user.type(input, "Cambio"));
    expect(document.activeElement).toBe(input);
    await key("{Escape}");
    expect(close).toHaveBeenCalledExactlyOnceWith(true);
  });

  it("reopens during the exit animation without releasing the background or losing the original trigger", async () => {
    let reopen!: () => void;
    function Reopened() {
      const [open, setOpen] = useState(false);
      reopen = () => setOpen(true);
      return (
        <>
          <button onClick={reopen}>Abrir de nuevo</button>
          <SidePanel open={open} onClose={() => setOpen(false)}>
            <SidePanelHeader>
              <SidePanelTitle>Reapertura</SidePanelTitle>
            </SidePanelHeader>
          </SidePanel>
        </>
      );
    }
    await render(<Reopened />);
    const trigger = screen.getByText("Abrir de nuevo");
    await click(trigger);
    await key("{Escape}");
    await act(async () => reopen());
    await finishExit();
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("translate-x-0");
    expect(document.body.style.overflow).toBe("hidden");
    await key("{Escape}");
    await finishExit();
    expect(document.activeElement).toBe(trigger);
  });
});

describe("portaled controls inside SidePanel", () => {
  it("Select takes Escape before the panel, supports selection and Tab continuation", async () => {
    function Currency() {
      const [value, setValue] = useState("ARS");
      return (
        <>
          <Select
            value={value}
            onChange={setValue}
            options={[
              { value: "ARS", label: "Pesos" },
              { value: "USD", label: "Dólares" },
            ]}
          />
          <button>Siguiente</button>
        </>
      );
    }
    await render(
      <Panel>
        <Currency />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    await click(screen.getByText("Pesos"));
    expect(screen.getByRole("listbox").closest("[inert]")).toBeNull();
    await key("{ArrowDown}{Enter}");
    expect(screen.queryByRole("listbox")).toBeNull();
    await click(screen.getByText("Dólares"));
    await key("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
    await click(screen.getByText("Dólares"));
    await tab();
    expect(document.activeElement).toBe(screen.getByText("Siguiente"));
  });

  it("DatePicker accepts focus in its calendar and restores its button", async () => {
    await render(
      <Panel>
        <DatePicker value="2026-10-13" onChange={() => {}} />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    const trigger = screen.getByLabelText("Abrir calendario");
    await click(trigger);
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    const calendar = screen.getByRole("dialog", { name: "Elegir fecha" });
    expect(calendar.contains(document.activeElement)).toBe(true);
    await act(async () =>
      within(calendar).getByLabelText("Mes anterior").focus(),
    );
    await tab();
    expect(document.activeElement).toBe(
      within(calendar).getByLabelText("Mes siguiente"),
    );
    await tab();
    expect(calendar.contains(document.activeElement)).toBe(true);
    await key("{ArrowRight}");
    await key("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Elegir fecha" })).toBeNull();
    expect(document.activeElement).toBe(trigger);
    expect(
      screen.getByRole("dialog", { name: "Panel de prueba" }),
    ).toBeTruthy();
  });

  it("DropdownMenu supports focus, Shift+Tab and dismissal without closing the parent", async () => {
    await render(
      <Panel>
        <button>Anterior</button>
        <DropdownMenu
          ariaLabel="Acciones"
          trigger="Menú"
          items={[{ id: "one", label: "Acción", onSelect: () => {} }]}
        />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    const trigger = screen.getByRole("button", { name: "Acciones" });
    await click(trigger);
    await act(
      async () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    expect(screen.getByRole("menu").contains(document.activeElement)).toBe(
      true,
    );
    await tab(true);
    expect(document.activeElement).toBe(screen.getByText("Anterior"));
    await click(trigger);
    await key("{Escape}");
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryByRole("menu")).toBeNull();
    await click(trigger);
    await click(screen.getByRole("dialog").previousElementSibling!);
    expect(screen.queryByRole("menu")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("outside clicks on a sibling field close the popup without stealing the field's focus", async () => {
    await render(
      <Panel>
        <DropdownMenu
          ariaLabel="Opciones de campo"
          trigger="Opciones"
          items={[{ id: "one", label: "Uno", onSelect: () => {} }]}
        />
        <input aria-label="Otro campo" />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    await click(screen.getByRole("button", { name: "Opciones de campo" }));
    await click(screen.getByLabelText("Otro campo"));
    expect(screen.queryByRole("menu")).toBeNull();
    expect(document.activeElement).toBe(screen.getByLabelText("Otro campo"));
  });

  it("opening a modal from a menu does not let menu restoration steal its focus", async () => {
    function MenuModal() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <DropdownMenu
            ariaLabel="Opciones"
            trigger="Menú"
            items={[
              {
                id: "open",
                label: "Abrir detalle",
                onSelect: () => setOpen(true),
              },
            ]}
          />
          <Modal open={open} onClose={() => setOpen(false)}>
            <ModalTitle>Detalle</ModalTitle>
            <button>Interior</button>
          </Modal>
        </>
      );
    }
    await render(<MenuModal />);
    const trigger = screen.getByRole("button", { name: "Opciones" });
    await click(trigger);
    await click(screen.getByRole("menuitem"));
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );
    await key("{Escape}");
    await finishExit();
    expect(document.activeElement).toBe(trigger);
  });

  it("SearchCombobox stays usable with async results and consumes only its own Escape", async () => {
    const loadOptions = vi
      .fn()
      .mockResolvedValue([{ value: "1", label: "Contacto" }]);
    await render(
      <Panel>
        <SearchCombobox
          value={null}
          onChange={() => {}}
          minQueryLength={0}
          debounceMs={0}
          loadOptions={loadOptions}
        />
      </Panel>,
    );
    await click(screen.getByText("Abrir panel"));
    await click(screen.getByRole("combobox"));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 20)));
    expect(screen.getByRole("option").textContent).toBe("Contacto");
    expect(screen.getByRole("listbox").closest("[inert]")).toBeNull();
    await key("{Escape}");
    expect(screen.queryByRole("listbox")).toBeNull();
    expect(screen.getByRole("dialog")).toBeTruthy();
  });
});

describe("forms, announcements and lifecycle", () => {
  it("preserves native validity, inline alerts and Toast announcements while isolating visual toast actions", async () => {
    function Form() {
      const { toast } = useToast();
      const [error, setError] = useState(false);
      return (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setError(true);
            toast.error("No se pudo guardar");
          }}
        >
          <FormField state={error ? "error" : "default"}>
            <Label>Nombre requerido</Label>
            <Input required />
            {error && <ErrorMessage>Error de servidor</ErrorMessage>}
          </FormField>
          <button type="submit">Guardar</button>
        </form>
      );
    }
    await render(
      <ToastProvider>
        <Panel>
          <Form />
        </Panel>
      </ToastProvider>,
    );
    await click(screen.getByText("Abrir panel"));
    const input = screen.getByLabelText("Nombre requerido") as HTMLInputElement;
    await click(screen.getByText("Guardar"));
    expect(input.checkValidity()).toBe(false);
    expect(screen.queryByRole("alert")).toBeNull();
    await act(async () => user.type(input, "Nombre"));
    await click(screen.getByText("Guardar"));
    expect(screen.getByRole("alert").textContent).toContain(
      "Error de servidor",
    );
    expect(input.getAttribute("aria-describedby")).toBe(
      screen.getByRole("alert").id,
    );
    expect(screen.getByRole("status").textContent).toContain(
      "No se pudo guardar",
    );
    expect(screen.getByRole("status").closest("[inert]")).toBeNull();
    expect(
      document
        .querySelector('[aria-label="Cerrar notificación"]')
        ?.closest("[inert]"),
    ).not.toBeNull();
    await act(async () => input.focus());
    expect(document.activeElement).toBe(input);
  });

  it("restores pre-existing background attributes and copes with a removed trigger", async () => {
    const existing = document.createElement("section");
    existing.setAttribute("inert", "");
    existing.setAttribute("aria-hidden", "false");
    document.body.append(existing);
    function RemovedTrigger() {
      const [open, setOpen] = useState(false);
      return (
        <>
          {!open && <button onClick={() => setOpen(true)}>Temporal</button>}
          <Modal open={open} onClose={() => setOpen(false)}>
            <ModalTitle>Sin trigger estable</ModalTitle>
          </Modal>
        </>
      );
    }
    await render(<RemovedTrigger />);
    await click(screen.getByText("Temporal"));
    await key("{Escape}");
    await finishExit();
    expect(existing.getAttribute("aria-hidden")).toBe("false");
    expect(existing.hasAttribute("inert")).toBe(true);
    expect(document.body.style.overflow).toBe("");
  });

  it.each([390, 1440])(
    "keeps the panel responsive structure and internal scrolling at width %i (DOM contract)",
    async (width) => {
      vi.stubGlobal("innerWidth", width);
      await render(<Panel />);
      await click(screen.getByText("Abrir panel"));
      const dialog = screen.getByRole("dialog");
      expect(dialog.className).toContain("w-full");
      expect(dialog.className).toContain("sm:max-w-xl");
      expect(dialog.querySelector(".overflow-y-auto")).not.toBeNull();
      expect(document.body.style.overflow).toBe("hidden");
      await act(async () => fireEvent.resize(window));
      expect(dialog.contains(document.activeElement)).toBe(true);
    },
  );
});
