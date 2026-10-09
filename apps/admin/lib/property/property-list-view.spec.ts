import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  PropertyListItem,
  PropertyListResponse,
} from "@repo/shared-types";
import { ToastProvider } from "@repo/ui/toast";
import { PropertyListView } from "@/components/property/property-list-view";
import { parsePropertyListQuery } from "./property-list-query";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/propiedades",
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    createElement("a", { href }, children),
}));

const item = (
  capabilities: PropertyListItem["capabilities"],
  isActive = true,
): PropertyListItem => ({
  id: "p1",
  slug: "casa",
  title: "Casa",
  internalCode: "001",
  propertyType: "HOUSE",
  isActive,
  location: { localityName: "Rosario", neighborhoodName: "Centro" },
  listingTypes: ["SALE", "RENT"],
  statusVariant: isActive ? "published" : "archived",
  isAnyPublishable: isActive,
  publicUrl: isActive
    ? "https://example.org/propiedades/casa?listingType=SALE"
    : null,
  activeListingsCount: 2,
  createdBy: {
    id: "u",
    name: "Ana",
    email: "ana@example.org",
    isActive: false,
  },
  capabilities,
});
const response = (
  items: PropertyListItem[],
  total: number,
): PropertyListResponse => ({
  items,
  total,
  totalPages: Math.ceil(total / 20),
  page: 1,
  pageSize: 20,
  commercialCounts: {
    all: total,
    active: total,
    archived: 0,
    published: total,
    commercialDraft: 0,
  },
});
function render(
  result: PropertyListResponse,
  raw: Record<string, string> = {},
) {
  return renderToStaticMarkup(
    createElement(
      ToastProvider,
      null,
      createElement(PropertyListView, {
        result,
        filters: parsePropertyListQuery(raw),
        provinceOptions: [],
        canCreate: true,
      }),
    ),
  );
}

describe("Property list server-rendered states", () => {
  it.each([
    ["published", "Publicada", true],
    ["commercial-draft", "Borrador comercial", true],
    ["archived", "Archivada", false],
  ] as const)(
    "renders only the %s badge in the commercial status cell",
    (statusVariant, label, isActive) => {
      const property = item(
        { canEdit: false, canArchive: false, canRestore: false },
        isActive,
      );
      const html = render(response([{ ...property, statusVariant }], 1));
      const row = html.match(/<tbody[^>]*>\s*<tr[^>]*>([\s\S]*?)<\/tr>/)?.[1];
      const cells = [...(row ?? "").matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)];

      expect(cells).toHaveLength(7);
      expect(cells[4]?.[1]).toMatch(new RegExp(`^<span[^>]*>${label}</span>$`));
    },
  );

  it("renders exactly the seven existing columns, status, operations and permitted actions", () => {
    const html = render(
      response(
        [item({ canEdit: true, canArchive: true, canRestore: false })],
        1,
      ),
    );
    for (const name of [
      "Propiedad",
      "Tipo",
      "Ubicación",
      "Comercialización",
      "Estado comercial",
      "Creada por",
      "Acciones",
    ])
      expect(html).toContain(name);
    expect(html.match(/scope="col"/g) ?? []).toHaveLength(7);
    expect(html).toContain("001");
    expect(html).toContain("Alquiler");
    expect(html).toContain("Usuario inactivo");
    expect(html).toContain("Ver en web");
    expect(html).toContain("Editar");
    expect(html).toContain("Archivar");
    expect(html).toContain("Mostrando 1–1 de 1 propiedades");
    expect(html).toContain("overflow-x-auto");
  });

  it("uses UI Kit colors by listing type without changing commercial status badges", () => {
    const property = item({
      canEdit: false,
      canArchive: false,
      canRestore: false,
    });
    const html = render(
      response(
        [{ ...property, listingTypes: ["SALE", "RENT", "TEMPORARY_RENT"] }],
        1,
      ),
    );
    const cells = [
      ...(
        html.match(/<tbody[^>]*>\s*<tr[^>]*>([\s\S]*?)<\/tr>/)?.[1] ?? ""
      ).matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g),
    ];
    expect(cells[3]?.[1]).toMatch(
      /class="[^"]*bg-blue-100 text-blue-700[^"]*">Venta<\/span>/,
    );
    expect(cells[3]?.[1]).toMatch(
      /class="[^"]*bg-green-100 text-green-700[^"]*">Alquiler<\/span>/,
    );
    expect(cells[3]?.[1]).toMatch(
      /class="[^"]*bg-gray-100 text-gray-600[^"]*">Alquiler temporario<\/span>/,
    );
    expect(cells[4]?.[1]).toMatch(/^<span[^>]*>Publicada<\/span>$/);
  });

  it("does not expose edit, archive or restore for a read-only row", () => {
    const html = render(
      response(
        [item({ canEdit: false, canArchive: false, canRestore: false })],
        1,
      ),
    );
    expect(html).not.toContain(">Editar<");
    expect(html).not.toContain(">Archivar<");
    expect(html).not.toContain(">Restaurar<");
    expect(html).toContain("Ver en web");
  });

  it("shows restore only for eligible archived rows", () => {
    const html = render(
      response(
        [item({ canEdit: true, canArchive: false, canRestore: true }, false)],
        1,
      ),
    );
    expect(html).toContain("Restaurar");
    expect(html).not.toContain(">Archivar<");
    expect(html).not.toContain("Ver en web");
  });

  it("distinguishes zero inventory from empty filtered results and keeps filter controls", () => {
    const zero = render(response([], 0));
    expect(zero).toContain("Sin propiedades todavía");
    const empty = render(
      { ...response([], 5), totalPages: 1 },
      { estado: "archived", atencion: "without-images" },
    );
    expect(empty).toContain("Sin resultados");
    expect(empty).toContain("Filtros activos:");
    expect(empty).toContain("Sin imágenes");
    expect(empty).toContain("Limpiar filtros");
  });

  it("exposes sorting only on the five approved headers with aria-sort", () => {
    const html = render(response([], 0), { sortBy: "title", sortOrder: "asc" });
    expect(html).toContain('aria-sort="ascending"');
    expect(html.match(/aria-sort="none"/g) ?? []).toHaveLength(4);
    expect(html.match(/aria-sort=/g) ?? []).toHaveLength(5);
  });
});
