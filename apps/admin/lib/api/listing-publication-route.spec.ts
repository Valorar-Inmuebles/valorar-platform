import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  PATCH,
  DELETE,
} from "@/app/api/properties/[propertyId]/listings/[listingId]/route";
import {
  detailListings,
  detailPrices,
} from "@/lib/property/detail-context.fixture";
import { evaluateListingPublishability } from "@repo/property-rules";

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  close: vi.fn(),
  prices: vi.fn(),
  publishability: vi.fn(),
  web: vi.fn(),
}));
vi.mock("@/lib/api/property-listing", () => ({
  updatePropertyListing: mocks.update,
  closePropertyListing: mocks.close,
}));
vi.mock("@/lib/api/property-price", () => ({
  listPropertyPrices: mocks.prices,
}));
vi.mock("@/lib/api/property-publishability", () => ({
  getPropertyPublishability: mocks.publishability,
}));
vi.mock("@/lib/web/revalidate-public", () => ({
  revalidatePublicWeb: mocks.web,
}));
const context = {
  params: Promise.resolve({ propertyId: "property-1", listingId: "listing-1" }),
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.prices.mockResolvedValue(detailPrices);
  mocks.publishability.mockResolvedValue(
    evaluateListingPublishability({
      propertyIsActive: true,
      imageCount: 1,
      hasCoverImage: true,
      listingStatus: "ACTIVE",
      hasPrimaryPrice: true,
    }),
  );
  mocks.update.mockResolvedValue(detailListings[0]);
  mocks.close.mockResolvedValue({ ...detailListings[0], status: "CLOSED" });
});

describe("Listing mutation response and Web invalidation", () => {
  it.each(["ACTIVE", "PAUSED"])(
    "updates one listing to %s and awaits one Web invalidation before returning",
    async (status) => {
      let release!: () => void;
      let started!: () => void;
      const invalidating = new Promise<void>((resolve) => {
        started = resolve;
      });
      mocks.web.mockImplementation(() => {
        started();
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      });
      let finished = false;
      const response = PATCH(
        new Request("http://localhost/api", {
          method: "PATCH",
          body: JSON.stringify({ payload: { status }, propertySlug: "casa" }),
        }),
        context,
      ).then((result) => {
        finished = true;
        return result;
      });
      await invalidating;
      expect(finished).toBe(false);
      expect(mocks.update).toHaveBeenCalledExactlyOnceWith("listing-1", {
        status,
      });
      expect(mocks.publishability).toHaveBeenCalledExactlyOnceWith(
        "property-1",
        "listing-1",
      );
      expect(mocks.web).toHaveBeenCalledExactlyOnceWith("casa");
      release();
      expect(await (await response).json()).toMatchObject({
        ok: true,
        listing: { id: "listing-1" },
      });
    },
  );

  it("revalidates Web on close using the same flow", async () => {
    const response = await DELETE(
      new Request("http://localhost/api", {
        method: "DELETE",
        body: JSON.stringify({ propertySlug: "casa" }),
      }),
      context,
    );
    expect(mocks.close).toHaveBeenCalledExactlyOnceWith("listing-1");
    expect(mocks.web).toHaveBeenCalledExactlyOnceWith("casa");
    expect(await response.json()).toMatchObject({ ok: true });
  });
});
