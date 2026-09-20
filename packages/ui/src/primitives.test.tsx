import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminTable, AdminTableHead, AdminTableHeader } from "./admin-table";
import { Button } from "./button";
import { DatePicker } from "./date-picker";
import { DropdownMenu } from "./dropdown-menu";
import { Pagination } from "./pagination";
import { SearchCombobox } from "./search-combobox";
import { Stepper } from "./stepper";
import { TabPanel, Tabs } from "./tabs";

describe("shared primitives semantics", () => {
  it("renders DatePicker as a localized date-only field with calendar affordance", () => {
    const html = renderToStaticMarkup(
      <DatePicker value="2026-09-19" onChange={vi.fn()} />,
    );
    expect(html).toContain('value="19/09/2026"');
    expect(html).toContain('aria-label="Abrir calendario"');
  });

  it("renders SearchCombobox with combobox semantics without loading options eagerly", () => {
    const loadOptions = vi.fn().mockResolvedValue([]);
    const html = renderToStaticMarkup(
      <SearchCombobox
        value={null}
        onChange={vi.fn()}
        loadOptions={loadOptions}
      />,
    );
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-expanded="false"');
    expect(loadOptions).not.toHaveBeenCalled();
  });

  it("exposes tab, panel and exceptional badge semantics", () => {
    const html = renderToStaticMarkup(
      <>
        <Tabs
          id="example"
          ariaLabel="Secciones"
          value="attention"
          onChange={vi.fn()}
          items={[
            { value: "general", label: "General" },
            {
              value: "attention",
              label: "Atención",
              badge: 2,
              tone: "danger",
            },
          ]}
        />
        <TabPanel
          tabsId="example"
          value="attention"
          tabValue="attention"
          index={1}
        >
          Contenido
        </TabPanel>
      </>,
    );
    expect(html).toContain('role="tablist"');
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain('aria-labelledby="example-tab-1"');
  });

  it("renders operational navigation and table sorting semantics", () => {
    const html = renderToStaticMarkup(
      <>
        <Pagination
          page={2}
          totalPages={4}
          total={35}
          pageSize={10}
          onPageChange={vi.fn()}
        />
        <AdminTable>
          <AdminTableHead>
            <tr>
              <AdminTableHeader direction="asc" onSort={vi.fn()}>
                Nombre
              </AdminTableHeader>
            </tr>
          </AdminTableHead>
        </AdminTable>
      </>,
    );
    expect(html).toContain("Mostrando 11–20 de 35");
    expect(html).toContain('aria-sort="ascending"');
  });

  it("renders Stepper and DropdownMenu without domain knowledge", () => {
    const html = renderToStaticMarkup(
      <>
        <Stepper
          items={[
            { id: "one", label: "Uno", status: "completed" },
            { id: "two", label: "Dos", status: "current" },
            { id: "three", label: "Tres", status: "pending" },
          ]}
        />
        <DropdownMenu
          ariaLabel="Acciones"
          trigger={<span>Más</span>}
          items={[
            { id: "edit", label: "Editar", onSelect: vi.fn() },
            {
              id: "delete",
              label: "Eliminar",
              destructive: true,
              onSelect: vi.fn(),
            },
          ]}
        />
      </>,
    );
    expect(html).toContain('aria-current="step"');
    expect(html).toContain('aria-haspopup="menu"');
  });

  it("uses a custom button as the menu trigger without nesting buttons", () => {
    const html = renderToStaticMarkup(
      <DropdownMenu
        ariaLabel="More actions"
        asChild
        trigger={<Button variant="secondary">More actions</Button>}
        items={[{ id: "edit", label: "Edit", onSelect: vi.fn() }]}
      />,
    );

    expect(html.match(/<button/g)).toHaveLength(1);
    expect(html).toContain('aria-haspopup="menu"');
  });
});
