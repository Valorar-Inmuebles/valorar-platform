// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { fireEvent, screen, within } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@repo/ui/toast";
import { ProfileSettings } from "@/components/config/profile-settings";
import type { AdminUser } from "@/lib/api/types/user";
import type { AuthUser } from "@/lib/auth/types";
import { mapPasswordChangeError } from "./password-change";

const actions = vi.hoisted(() => ({
  changePasswordAction: vi.fn(),
  updateProfileAction: vi.fn(),
}));
vi.mock("@/lib/api/password-actions", () => ({
  changePasswordAction: actions.changePasswordAction,
}));
vi.mock("@/lib/api/user-actions", () => ({
  updateProfileAction: actions.updateProfileAction,
}));
const identity: AuthUser = {
  id: "u",
  name: "Ana Pérez",
  firstName: "Ana",
  lastName: "Pérez",
  email: "ana@example.invalid",
  role: "TENANT_ADMIN",
  tenantId: "t",
  permissions: [],
};
const profile: AdminUser = {
  ...identity,
  firstName: "Ana",
  lastName: "Pérez",
  isActive: true,
  createdAt: "",
  updatedAt: "",
};
let root: Root;
let container: HTMLDivElement;
async function render(user = identity, value: AdminUser | undefined = profile) {
  await act(async () =>
    root.render(
      createElement(
        ToastProvider,
        null,
        createElement(ProfileSettings, { user, profile: value }),
      ),
    ),
  );
}
beforeEach(async () => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  actions.changePasswordAction.mockReset().mockResolvedValue({ ok: true });
  actions.updateProfileAction.mockReset().mockResolvedValue({ ok: true });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await render();
});
afterEach(async () => {
  await act(async () => root.unmount());
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
async function fill(
  currentPassword = "legacy8!",
  newPassword = "nueva clave segura",
  confirmation = newPassword,
) {
  const user = userEvent.setup();
  for (const [label, value] of [
    ["Contraseña actual", currentPassword],
    ["Nueva contraseña", newPassword],
    ["Confirmar nueva contraseña", confirmation],
  ]) {
    const input = screen.getByLabelText(new RegExp(`^${label}`), {
      exact: false,
      selector: "input",
    });
    await act(async () => {
      await user.clear(input);
      if (value) await user.type(input, value);
    });
  }
}
async function submitPassword() {
  await act(async () =>
    fireEvent.submit(
      screen.getByRole("form", { name: "Seguridad de la cuenta" }),
    ),
  );
}

describe("Profile Settings", () => {
  it.each([390, 1440])(
    "keeps personal first and uses the responsive two-column grid (%s structural DOM)",
    (width) => {
      vi.stubGlobal("innerWidth", width);
      const grid = container.querySelector(".lg\\:grid-cols-2")!;
      expect(grid.classList.contains("grid-cols-1")).toBe(true);
      expect(grid.children[0]!.textContent).toContain("Información personal");
      expect(grid.children[1]!.textContent).toContain("Seguridad de la cuenta");
      expect(screen.getAllByRole("form")).toHaveLength(2);
      expect(
        within(
          screen.getByRole("form", { name: "Información personal" }),
        ).queryByLabelText("Nueva contraseña"),
      ).toBeNull();
    },
  );
  it("saves personal fields independently and never sends a password", async () => {
    await fill();
    await act(async () =>
      fireEvent.submit(
        screen.getByRole("form", { name: "Información personal" }),
      ),
    );
    expect(actions.updateProfileAction).toHaveBeenCalledWith({
      firstName: "Ana",
      lastName: "Pérez",
      phone: undefined,
      avatarUrl: undefined,
    });
    expect(actions.changePasswordAction).not.toHaveBeenCalled();
    expect(
      (
        screen.getByLabelText(/^Nueva contraseña/, {
          selector: "input",
          exact: false,
        }) as HTMLInputElement
      ).value,
    ).toBe("nueva clave segura");
  });
  it("validates required fields and focuses the first error", async () => {
    await submitPassword();
    expect(actions.changePasswordAction).not.toHaveBeenCalled();
    expect(screen.getByText("Ingresá tu contraseña actual.")).toBeTruthy();
    expect(document.activeElement?.getAttribute("name")).toBe(
      "currentPassword",
    );
  });
  it("validates confirmation, Unicode policy and reuse locally", async () => {
    await fill("old", "new", "other");
    await submitPassword();
    expect(screen.getByText("Usá al menos 12 caracteres.")).toBeTruthy();
    expect(screen.getByText("Las contraseñas no coinciden.")).toBeTruthy();
    await fill("clave repetida", "clave repetida");
    await submitPassword();
    expect(
      screen.getByText("La nueva contraseña debe ser diferente de la actual."),
    ).toBeTruthy();
    expect(actions.changePasswordAction).not.toHaveBeenCalled();
  });
  it("updates accessible meter and toggles each password independently", async () => {
    await fill();
    expect(screen.getByRole("meter").getAttribute("aria-valuetext")).toBe(
      "Fuerte",
    );
    const input = screen.getByLabelText("Contraseña actual", {
      selector: "input",
      exact: false,
    });
    expect(input.getAttribute("type")).toBe("password");
    const user = userEvent.setup();
    await act(async () =>
      user.click(
        screen.getByRole("button", { name: "Mostrar contraseña actual" }),
      ),
    );
    expect(input.getAttribute("type")).toBe("text");
    expect(
      screen
        .getByRole("button", { name: "Ocultar contraseña actual" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(
      screen
        .getByLabelText(/^Nueva contraseña/, {
          selector: "input",
          exact: false,
        })
        .getAttribute("type"),
    ).toBe("password");
    await act(async () =>
      user.click(
        screen.getByRole("button", { name: "Ocultar contraseña actual" }),
      ),
    );
    expect(input.getAttribute("type")).toBe("password");
  });
  it("prevents duplicate submissions, omits confirmation, clears only security on success", async () => {
    let resolve!: (value: unknown) => void;
    actions.changePasswordAction.mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    );
    await fill(" old  ", " new password  ");
    await act(async () => {
      fireEvent.submit(
        screen.getByRole("form", { name: "Seguridad de la cuenta" }),
      );
      fireEvent.submit(
        screen.getByRole("form", { name: "Seguridad de la cuenta" }),
      );
    });
    expect(actions.changePasswordAction).toHaveBeenCalledTimes(1);
    expect(actions.changePasswordAction).toHaveBeenCalledWith({
      currentPassword: " old  ",
      newPassword: " new password  ",
    });
    expect(
      (
        screen.getByRole("button", {
          name: "Guardar perfil",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    await act(async () => resolve({ ok: true }));
    for (const input of screen
      .getByRole("form", { name: "Seguridad de la cuenta" })
      .querySelectorAll("input")) {
      expect(input.value).toBe("");
      expect(input.type).toBe("password");
    }
    expect((screen.getByLabelText("Nombre") as HTMLInputElement).value).toBe(
      "Ana",
    );
    expect(screen.getByRole("status").textContent).toContain(
      "Tu sesión sigue activa",
    );
  });
  it.each([
    [400, "CURRENT_PASSWORD_INVALID"],
    [422, "PASSWORD_POLICY_VIOLATION"],
    [422, "PASSWORD_REUSED"],
    [503, "PASSWORD_CHANGE_UNAVAILABLE"],
    [409, "CREDENTIALS_CHANGED"],
    [403, "REQUEST_ORIGIN_NOT_ALLOWED"],
  ] as const)(
    "shows structured %s %s preserving inputs",
    async (status, code) => {
      const failure = mapPasswordChangeError(status, { code });
      actions.changePasswordAction.mockResolvedValue(failure);
      await fill();
      await submitPassword();
      expect(
        screen
          .getAllByRole("alert")
          .some((node) => node.textContent?.includes(failure.message)),
      ).toBe(true);
      expect(
        (
          screen.getByLabelText("Contraseña actual", {
            selector: "input",
            exact: false,
          }) as HTMLInputElement
        ).value,
      ).toBe("legacy8!");
      expect(container.textContent).not.toContain("sesión expiró");
    },
  );
  it("shows the 429 wait time, prevents retries and releases the button at expiry", async () => {
    actions.changePasswordAction.mockResolvedValue(
      mapPasswordChangeError(429, { retryAfterSeconds: 61 }),
    );
    await fill();
    vi.useFakeTimers();
    await submitPassword();
    expect(screen.getByRole("timer").textContent).toContain("1:01");
    await submitPassword();
    expect(actions.changePasswordAction).toHaveBeenCalledTimes(1);
    expect(
      (
        screen.getByRole("button", {
          name: "Cambiar contraseña",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await act(async () => vi.advanceTimersByTime(61000));
    expect(screen.queryByRole("timer")).toBeNull();
    expect(
      (
        screen.getByRole("button", {
          name: "Cambiar contraseña",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
  });
  it("keeps security available to Super Admin without a selected tenant", async () => {
    await act(async () =>
      root.render(
        createElement(
          ToastProvider,
          null,
          createElement(ProfileSettings, {
            user: { ...identity, tenantId: null, role: "SUPER_ADMIN" },
          }),
        ),
      ),
    );
    expect(screen.queryByRole("button", { name: "Guardar perfil" })).toBeNull();
    expect(screen.getByText(/edición limitada para Super Admin/)).toBeTruthy();
    await fill();
    await submitPassword();
    expect(actions.changePasswordAction).toHaveBeenCalledTimes(1);
  });
});
