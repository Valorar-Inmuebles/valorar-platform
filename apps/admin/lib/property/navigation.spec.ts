import { describe, expect, it } from "vitest";
import {
  getPropertyLifecycleFormState,
  PROPERTY_STATUS_LABELS,
} from "./navigation";

describe("Property lifecycle presentation", () => {
  it("labels an active property as Activa", () => {
    const state = getPropertyLifecycleFormState(true);

    expect(state.status).toBe("active");
    expect(PROPERTY_STATUS_LABELS[state.status]).toBe("Activa");
    expect(state.description).toBe(
      "Para archivar esta propiedad utilizá la acción “Archivar”.",
    );
  });

  it("labels an archived property as Archivada", () => {
    const state = getPropertyLifecycleFormState(false);

    expect(state.status).toBe("archived");
    expect(PROPERTY_STATUS_LABELS[state.status]).toBe("Archivada");
    expect(state.description).toBe(
      "Para volver a utilizar esta propiedad utilizá la acción “Restaurar”.",
    );
  });
});
