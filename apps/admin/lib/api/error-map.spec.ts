import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api/client";
import { mapRentalError } from "@/lib/api/error-map";

describe("mapRentalError", () => {
  it("translates Rental domain invariants without exposing internal fields", () => {
    const message = mapRentalError(
      new ApiError("endsOn is required to activate a rental contract", 400, {
        message: "endsOn is required to activate a rental contract",
      }),
    );

    expect(message).toBe(
      "La fecha de finalización es obligatoria para activar el contrato.",
    );
    expect(message).not.toContain("endsOn");
  });

  it("uses a safe fallback for unexpected errors", () => {
    expect(
      mapRentalError(new Error("PrismaClientKnownRequestError P2002")),
    ).toBe("Ocurrió un error al procesar la solicitud. Intentá nuevamente.");
  });

  it("preserves HTTP semantics while mapping the user-facing message", () => {
    expect(
      mapRentalError(new ApiError("anything", 404, { message: "anything" })),
    ).toBe("No se encontró el recurso solicitado.");
  });
});
