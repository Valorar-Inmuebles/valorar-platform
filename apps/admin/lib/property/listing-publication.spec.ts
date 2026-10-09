import {
  createElement,
  type ReactNode,
  type FormEvent,
  isValidElement,
} from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "@repo/ui/toast";
import { PropertyCommercializationView } from "@/components/property/property-commercialization-view";
import {
  PropertyListingCommercialPanel,
  type PropertyListingCommercialPanelProps,
} from "@/components/property/property-listing-commercial-panel";
import {
  detailListings,
  detailPrices,
  detailProperty,
} from "./detail-context.fixture";
import { listingActivationChecklist } from "./listing-activation";
import {
  mapApiPublishabilityToListing,
  buildPropertyPublishabilitySummary,
} from "./publishability";
import { evaluateListingPublishability } from "@repo/property-rules";
import { buildPropertyExecutiveSnapshot } from "./property-executive";
import { applyListingMutation } from "./commercialization-state";

const state = vi.hoisted(() => ({
  refresh: vi.fn(),
  update: vi.fn(),
  close: vi.fn(),
  replace: vi.fn(),
  edit: "",
  tasks: [] as Promise<void>[],
  submit: null as null | ((event: FormEvent<HTMLFormElement>) => void),
  panel: null as PropertyListingCommercialPanelProps | null,
}));
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useTransition: () => [
    false,
    (callback: () => Promise<void>) => {
      state.tasks.push(callback());
    },
  ],
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: state.refresh, replace: state.replace }),
  usePathname: () => "/propiedades/p/publicaciones",
  useSearchParams: () =>
    new URLSearchParams(state.edit ? { edit: state.edit } : {}),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement("a", { href }, children),
}));
vi.mock("@/lib/api/commercialization-client", () => ({
  updateListingCommercializationClient: state.update,
  closeListingCommercializationClient: state.close,
  markPricePrimaryCommercializationClient: vi.fn(),
  deletePriceCommercializationClient: vi.fn(),
}));
vi.mock("@repo/ui/side-panel", () => {
  const Wrapper = ({ children }: { children: ReactNode }) =>
    createElement("div", null, children);
  return {
    SidePanel: ({ open, children }: { open: boolean; children: ReactNode }) =>
      open ? createElement(Wrapper, null, children) : null,
    SidePanelContent: ({ children }: { children: ReactNode }) => {
      if (
        isValidElement<{ onSubmit?: typeof state.submit }>(children) &&
        children.type === "form"
      )
        state.submit = children.props.onSubmit ?? null;
      return createElement(Wrapper, null, children);
    },
    SidePanelHeader: Wrapper,
    SidePanelFooter: Wrapper,
    SidePanelTitle: Wrapper,
    SidePanelDescription: Wrapper,
  };
});
vi.mock(
  "@/components/property/property-listing-commercial-panel",
  async (original) => {
    const actual =
      await original<
        typeof import("@/components/property/property-listing-commercial-panel")
      >();
    return {
      ...actual,
      PropertyListingCommercialPanel: (
        props: PropertyListingCommercialPanelProps,
      ) => {
        state.panel = props;
        return createElement(actual.PropertyListingCommercialPanel, props);
      },
    };
  },
);

const facts = { propertyIsActive: true, imageCount: 1, hasCoverImage: true };
const sale = { ...detailListings[0]!, status: "DRAFT" as const };
const rent = {
  ...detailListings[0]!,
  id: "rent",
  listingType: "RENT" as const,
  status: "PAUSED" as const,
};
const prices = [{ ...detailPrices[0]!, listingId: sale.id, isPrimary: true }];
const props = (): PropertyListingCommercialPanelProps => ({
  open: true,
  onClose: vi.fn(),
  propertyId: detailProperty.id,
  propertySlug: detailProperty.slug,
  listing: sale,
  prices,
  activationFacts: facts,
  initialStatus: "ACTIVE",
  onListingSaved: vi.fn(),
  onPricesSaved: vi.fn(),
  onPricesUpdated: vi.fn(),
});
function renderPanel(
  overrides: Partial<PropertyListingCommercialPanelProps> = {},
) {
  const input = { ...props(), ...overrides };
  const html = renderToStaticMarkup(
    createElement(
      ToastProvider,
      null,
      createElement(PropertyListingCommercialPanel, input),
    ),
  );
  return { input, html };
}
function publishability(
  listing = {
    ...sale,
    status: "ACTIVE" as (typeof detailListings)[number]["status"],
  },
) {
  return mapApiPublishabilityToListing(
    detailProperty,
    listing,
    evaluateListingPublishability({
      ...facts,
      listingStatus: listing.status,
      hasPrimaryPrice: true,
    }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.tasks = [];
  state.submit = null;
  state.panel = null;
  state.edit = "";
  vi.stubGlobal("window", { history: { replaceState: state.replace } });
  vi.stubEnv("PUBLIC_WEB_URL", "http://localhost:3000");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Publication workflow", () => {
  it.each(["DRAFT", "PAUSED", "RESERVED", "CLOSED"] as const)(
    "checks destination ACTIVE for %s and submits only its listing",
    async (status) => {
      const listing = { ...sale, status };
      const { input, html } = renderPanel({ listing });
      expect(html).toContain("cumple los requisitos para publicar");
      state.update.mockResolvedValue({
        ok: true,
        listing: { ...listing, status: "ACTIVE" },
        publishability: publishability(),
      });
      state.submit!({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      await Promise.all(state.tasks);
      expect(state.update).toHaveBeenCalledTimes(1);
      expect(state.update).toHaveBeenCalledWith(
        detailProperty.id,
        listing.id,
        expect.objectContaining({ status: "ACTIVE" }),
        detailProperty.slug,
      );
      expect(input.onListingSaved).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    [{ ...facts, propertyIsActive: false }, prices, "property-active"],
    [{ ...facts, imageCount: 0 }, prices, "has-image"],
    [{ ...facts, hasCoverImage: false }, prices, "cover-image"],
    [facts, [], "primary-price"],
  ] as const)(
    "explains missing prerequisites and prevents submission",
    async (activationFacts, operationPrices, missing) => {
      expect(
        listingActivationChecklist(activationFacts, [...operationPrices])
          .missing,
      ).toContain(missing);
      const { html } = renderPanel({
        activationFacts,
        prices: [...operationPrices],
      });
      expect(html).toContain("No se puede activar la publicación");
      expect(html).toContain("href=");
      expect(
        html.match(/<button[^>]*form="listing-commercial-form"[^>]*>/)?.[0],
      ).toContain('disabled=""');
      state.submit!({
        preventDefault: vi.fn(),
      } as unknown as FormEvent<HTMLFormElement>);
      await Promise.all(state.tasks);
      expect(state.update).not.toHaveBeenCalled();
    },
  );

  it("does not treat CLOSED visibility without price as activation readiness", () => {
    const visible = evaluateListingPublishability({
      ...facts,
      listingStatus: "CLOSED",
      hasPrimaryPrice: false,
    });
    expect(visible.isPublishable).toBe(true);
    expect(listingActivationChecklist(facts, []).missing).toEqual([
      "primary-price",
    ]);
  });

  it("keeps the panel open when definitive API validation fails", async () => {
    const { input } = renderPanel();
    state.update.mockResolvedValue({
      ok: false,
      code: "PUBLICATION_CHECKLIST_INCOMPLETE",
      missing: ["cover-image"],
      error: "Falta portada",
    });
    state.submit!({
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>);
    await Promise.all(state.tasks);
    expect(input.onListingSaved).not.toHaveBeenCalled();
  });

  it("pauses without applying activation requirements", async () => {
    renderPanel({
      listing: { ...sale, status: "ACTIVE" },
      initialStatus: "PAUSED",
      prices: [],
      activationFacts: { ...facts, propertyIsActive: false },
    });
    state.update.mockResolvedValue({
      ok: true,
      listing: { ...sale, status: "PAUSED" },
      publishability: publishability({ ...sale, status: "PAUSED" }),
    });
    state.submit!({
      preventDefault: vi.fn(),
    } as unknown as FormEvent<HTMLFormElement>);
    await Promise.all(state.tasks);
    expect(state.update).toHaveBeenCalledWith(
      detailProperty.id,
      sale.id,
      expect.objectContaining({ status: "PAUSED" }),
      detailProperty.slug,
    );
  });

  function renderView(canEdit = true) {
    return renderToStaticMarkup(
      createElement(
        ToastProvider,
        null,
        createElement(PropertyCommercializationView, {
          propertyId: detailProperty.id,
          propertySlug: detailProperty.slug,
          canEdit,
          activationFacts: facts,
          listings: [sale, rent, { ...sale, id: "active", status: "ACTIVE" }],
          pricesByListingId: { [sale.id]: prices },
          publishabilityByListingId: {},
        }),
      ),
    );
  }
  it("exposes all three per-operation actions and hides them without edit capability", () => {
    const html = renderView();
    for (const label of [
      "Publicar",
      "Reactivar publicación",
      "Pausar publicación",
      "Editar",
      "Cerrar",
    ])
      expect(html).toContain(label);
    const readOnly = renderView(false);
    for (const label of [
      "Publicar",
      "Reactivar publicación",
      "Pausar publicación",
    ])
      expect(readOnly).not.toContain(label);
  });

  it("refreshes the shared RSC header exactly once after saving, without a second router navigation", () => {
    state.edit = sale.id;
    renderView();
    state.panel!.onListingSaved(
      { ...sale, status: "ACTIVE" },
      publishability(),
    );
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.replace).toHaveBeenCalledWith(
      null,
      "",
      "/propiedades/p/publicaciones",
    );
  });

  it("keeps row, summary, header and public link coherent without changing RENT", () => {
    const activeSale = { ...sale, status: "ACTIVE" as const };
    const visibility = publishability(activeSale);
    const next = applyListingMutation([sale, rent], {}, activeSale, visibility);
    expect(next.listings[1]).toBe(rent);
    const summary = buildPropertyPublishabilitySummary(
      detailProperty,
      next.listings,
      next.publishabilityByListingId,
    );
    const header = buildPropertyExecutiveSnapshot({
      property: detailProperty,
      publishability: summary,
      listings: next.listings,
      pricesByListingId: { [sale.id]: prices },
      imageCount: 1,
      hasCoverImage: true,
      featureCount: 0,
    });
    expect(summary.isAnyPublishable).toBe(true);
    expect(header.commercialLabel).toBe("Publicada");
    expect(visibility.publicWebUrl).toContain("listingType=SALE");
    const pausedSale = { ...sale, status: "PAUSED" as const };
    const paused = applyListingMutation(
      next.listings,
      next.publishabilityByListingId,
      pausedSale,
      publishability(pausedSale),
    );
    expect(
      buildPropertyPublishabilitySummary(
        detailProperty,
        paused.listings,
        paused.publishabilityByListingId,
      ).isAnyPublishable,
    ).toBe(false);
  });
});
