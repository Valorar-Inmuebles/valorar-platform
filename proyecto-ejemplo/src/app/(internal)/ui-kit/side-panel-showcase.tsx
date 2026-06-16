"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField, Label, HelperText } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, type SelectOption } from "@/components/ui/select";
import {
  SidePanel,
  SidePanelHeader,
  SidePanelTitle,
  SidePanelDescription,
  SidePanelContent,
  SidePanelFooter,
  type SidePanelWidth,
} from "@/components/ui/side-panel";

// ── Local helpers ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// ── Textarea base style — no Textarea primitive exists in the UI Kit yet ──────
// Derived from Input's visual spec to maintain visual consistency.

const textareaBase =
  "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";

// ── Form options ──────────────────────────────────────────────────────────────

const TIPO_CONTACTO_OPTIONS: SelectOption[] = [
  { value: "telefono", label: "Teléfono" },
  { value: "celular",  label: "Celular" },
  { value: "email",    label: "Email" },
  { value: "whatsapp", label: "WhatsApp" },
];

// ── Scrolling content data ─────────────────────────────────────────────────────

const MOVIMIENTOS = [
  {
    fecha: "08 May 2026",
    tipo: "Escrito",
    descripcion: "Presentación de escrito de inicio de actuaciones.",
    usuario: "Dr. García",
  },
  {
    fecha: "05 May 2026",
    tipo: "Resolución",
    descripcion: "Resolución de apertura del expediente administrativo.",
    usuario: "Tribunal Laboral",
  },
  {
    fecha: "28 Abr 2026",
    tipo: "Notificación",
    descripcion: "Notificación enviada a las partes involucradas.",
    usuario: "Sistema",
  },
  {
    fecha: "20 Abr 2026",
    tipo: "Escrito",
    descripcion: "Contestación de demanda presentada por la parte demandada.",
    usuario: "Dra. Martínez",
  },
  {
    fecha: "14 Abr 2026",
    tipo: "Audiencia",
    descripcion: "Audiencia de conciliación celebrada. Sin acuerdo.",
    usuario: "Tribunal Laboral",
  },
  {
    fecha: "07 Abr 2026",
    tipo: "Pericia",
    descripcion: "Informe pericial contable presentado por el experto designado.",
    usuario: "Lic. Rodríguez",
  },
  {
    fecha: "01 Abr 2026",
    tipo: "Escrito",
    descripcion: "Alegato de bien probado presentado por la parte actora.",
    usuario: "Dr. García",
  },
];

// ── Width variants config ─────────────────────────────────────────────────────

const WIDTH_OPTIONS: SidePanelWidth[] = ["sm", "md", "lg", "xl"];

const widthLabel: Record<SidePanelWidth, string> = {
  sm: "SM",
  md: "MD",
  lg: "LG",
  xl: "XL",
};

const widthDescription: Record<SidePanelWidth, string> = {
  sm: "sm:max-w-md · 448px — Formularios simples, confirmaciones contextuales.",
  md: "sm:max-w-xl · 576px — Formularios estándar, detalle de registro.",
  lg: "sm:max-w-2xl · 672px — Formularios complejos, vistas de detalle con tabs.",
  xl: "sm:max-w-3xl · 768px — Superficies densas, nested CRUDs, timelines.",
};

// ── SidePanelShowcase ─────────────────────────────────────────────────────────

export function SidePanelShowcase() {
  const [basicOpen, setBasicOpen] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [footerOpen, setFooterOpen] = useState(false);
  const [openWidth, setOpenWidth] = useState<SidePanelWidth | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scrollOpen, setScrollOpen] = useState(false);
  const [noOverlayOpen, setNoOverlayOpen] = useState(false);

  // Form demo state
  const [contactTipo, setContactTipo] = useState("");

  return (
    <Card flat>
      <CardHeader>
        <CardTitle>SidePanel</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          Header · Title · Description · Content · Footer · widths · scroll · form
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* ── Basic ── */}
        <div className="space-y-1.5">
          <SectionLabel>Basic — header + content + close</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setBasicOpen(true)}>
              Abrir panel
            </Button>
          </SectionRow>
          <SidePanel open={basicOpen} onClose={() => setBasicOpen(false)}>
            <SidePanelHeader>
              <SidePanelTitle>Panel básico</SidePanelTitle>
            </SidePanelHeader>
            <SidePanelContent>
              <p>
                Composición mínima: <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">SidePanelHeader</code> +{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">SidePanelTitle</code> +{" "}
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">SidePanelContent</code>.
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                Cerrá con el botón ✕ o presionando <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>.
              </p>
            </SidePanelContent>
          </SidePanel>
        </div>

        <Divider />

        {/* ── SidePanelDescription ── */}
        <div className="space-y-1.5">
          <SectionLabel>Con descripción — SidePanelTitle + SidePanelDescription</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setDescriptionOpen(true)}>
              Abrir con descripción
            </Button>
          </SectionRow>
          <SidePanel open={descriptionOpen} onClose={() => setDescriptionOpen(false)}>
            <SidePanelHeader>
              <SidePanelTitle>Detalle de persona</SidePanelTitle>
              <SidePanelDescription>
                Visualización y edición de los datos de la persona seleccionada.
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <p>
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">SidePanelDescription</code> se
                renderiza debajo del título con tipografía secundaria. Provee contexto y se vincula
                automáticamente con <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">aria-describedby</code>.
              </p>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setDescriptionOpen(false)}>
                Cancelar
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

        <Divider />

        {/* ── With footer ── */}
        <div className="space-y-1.5">
          <SectionLabel>Con footer — header + content + acciones</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setFooterOpen(true)}>
              Abrir con footer
            </Button>
          </SectionRow>
          <SidePanel open={footerOpen} onClose={() => setFooterOpen(false)}>
            <SidePanelHeader>
              <SidePanelTitle>Composición completa</SidePanelTitle>
              <SidePanelDescription>
                Header sticky, content scrolleable, footer sticky con acciones.
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <p>
                El <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">SidePanelFooter</code> permanece
                fijo en la parte inferior. El contenido scrollea internamente cuando supera el alto disponible.
              </p>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setFooterOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => setFooterOpen(false)}>
                Guardar
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

        <Divider />

        {/* ── Width variants ── */}
        <div className="space-y-1.5">
          <SectionLabel>Width variants — sm · md · lg · xl</SectionLabel>
          <SectionRow>
            {WIDTH_OPTIONS.map((w) => (
              <Button key={w} variant="secondary" onClick={() => setOpenWidth(w)}>
                {widthLabel[w]}
              </Button>
            ))}
          </SectionRow>
          <SidePanel
            open={openWidth !== null}
            onClose={() => setOpenWidth(null)}
            width={openWidth ?? "md"}
          >
            <SidePanelHeader>
              <SidePanelTitle>
                {openWidth ? widthLabel[openWidth] : ""} — SidePanel
              </SidePanelTitle>
              <SidePanelDescription>
                {openWidth ? widthDescription[openWidth] : ""}
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <p className="font-mono text-xs text-indigo-600">
                {openWidth ? `width="${openWidth}"` : ""}
              </p>
              <p className="mt-2">
                {openWidth ? widthDescription[openWidth] : ""}
              </p>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setOpenWidth(null)}>
                Cerrar
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

        <Divider />

        {/* ── Form layout ── */}
        <div className="space-y-1.5">
          <SectionLabel>Form layout — width=&quot;md&quot; · Agregar contacto</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Agregar contacto
            </Button>
          </SectionRow>
          <SidePanel open={formOpen} onClose={() => setFormOpen(false)} width="md">
            <SidePanelHeader>
              <SidePanelTitle>Agregar contacto</SidePanelTitle>
              <SidePanelDescription>
                Los datos de contacto quedarán asociados a esta persona.
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

                {/* Tipo + Valor */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField>
                    <Label required>Tipo</Label>
                    <Select
                      options={TIPO_CONTACTO_OPTIONS}
                      value={contactTipo}
                      onChange={setContactTipo}
                      placeholder="Seleccionar…"
                    />
                  </FormField>
                  <FormField>
                    <Label required>Valor</Label>
                    <Input placeholder="ej. +54 9 11 1234-5678" />
                  </FormField>
                </div>

                {/* Etiqueta */}
                <FormField>
                  <Label>Etiqueta</Label>
                  <Input placeholder="ej. Celular laboral" />
                  <HelperText>Opcional. Identifica este contacto.</HelperText>
                </FormField>

                <div className="h-px bg-zinc-100" />

                {/* Notas — no existe primitivo Textarea en el UI Kit */}
                <FormField>
                  <Label>Notas</Label>
                  <textarea
                    rows={3}
                    placeholder="Observaciones sobre este contacto…"
                    className={textareaBase}
                  />
                  <HelperText>Opcional. Solo texto plano.</HelperText>
                </FormField>

                {/* Preferido */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">Opciones</p>
                  <Checkbox
                    size="sm"
                    label="Marcar como contacto preferido"
                  />
                </div>

              </form>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setFormOpen(false)}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={() => setFormOpen(false)}>
                Agregar contacto
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

        <Divider />

        {/* ── Scrolling content ── */}
        <div className="space-y-1.5">
          <SectionLabel>Scrolling content — header y footer fijos · contenido largo</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setScrollOpen(true)}>
              Ver movimientos
            </Button>
          </SectionRow>
          <SidePanel open={scrollOpen} onClose={() => setScrollOpen(false)} width="md">
            <SidePanelHeader>
              <SidePanelTitle>Movimientos del expediente</SidePanelTitle>
              <SidePanelDescription>
                Historial completo de actuaciones y resoluciones.
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <div className="space-y-0">
                {MOVIMIENTOS.map((m, i) => (
                  <div
                    key={i}
                    className="border-b border-zinc-100 py-3.5 last:border-0 last:pb-0"
                  >
                    <div className="mb-1 flex items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-zinc-900">{m.tipo}</span>
                      <span className="shrink-0 text-[11px] text-zinc-400">{m.fecha}</span>
                    </div>
                    <p className="text-xs text-zinc-600">{m.descripcion}</p>
                    <p className="mt-0.5 text-[11px] text-zinc-400">{m.usuario}</p>
                  </div>
                ))}
              </div>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setScrollOpen(false)}>
                Cerrar
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

        <Divider />

        {/* ── closeOnOverlay=false ── */}
        <div className="space-y-1.5">
          <SectionLabel>closeOnOverlay=false — el backdrop no cierra el panel</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setNoOverlayOpen(true)}>
              Abrir panel bloqueado
            </Button>
          </SectionRow>
          <SidePanel
            open={noOverlayOpen}
            onClose={() => setNoOverlayOpen(false)}
            closeOnOverlay={false}
          >
            <SidePanelHeader>
              <SidePanelTitle>Panel con cierre bloqueado</SidePanelTitle>
              <SidePanelDescription>
                Útil cuando hay cambios sin guardar o acciones pendientes.
              </SidePanelDescription>
            </SidePanelHeader>
            <SidePanelContent>
              <p>
                <code className="rounded bg-zinc-100 px-1 font-mono text-xs text-zinc-700">closeOnOverlay=false</code>{" "}
                deshabilita el cierre al hacer click en el backdrop.
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                Solo se puede cerrar con el botón ✕ o con{" "}
                <kbd className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px]">ESC</kbd>.
              </p>
            </SidePanelContent>
            <SidePanelFooter>
              <Button variant="secondary" onClick={() => setNoOverlayOpen(false)}>
                Cerrar
              </Button>
            </SidePanelFooter>
          </SidePanel>
        </div>

      </CardContent>
    </Card>
  );
}
