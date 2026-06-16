"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dropdown,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  ConfirmModal,
  type ModalSize,
} from "@/components/ui/modal";
import {
  IconBell,
  IconChevronDown,
  IconFolder,
  IconLogOut,
  IconMessage,
  IconSearch,
  IconSettings,
} from "@/components/ui/icons";

// ── Local helpers (same pattern as other showcases) ───────────────────────────

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

// ── Dropdown showcase ─────────────────────────────────────────────────────────

export function DropdownShowcase() {
  return (
    <Card flat>
      <CardHeader>
        <CardTitle>Dropdown</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          Trigger · Content · Item · Label · Separator
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* align=end with icons */}
        <div className="space-y-1.5">
          <SectionLabel>Default — align=&quot;end&quot; · with icons and danger item</SectionLabel>
          <SectionRow>
            <Dropdown align="end">
              <DropdownTrigger>
                <Button variant="secondary" rightIcon={<IconChevronDown className="size-3.5" />}>
                  Options
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem icon={<IconSearch className="size-3.5" />}>View details</DropdownItem>
                <DropdownItem icon={<IconFolder className="size-3.5" />}>Move to folder</DropdownItem>
                <DropdownItem icon={<IconMessage className="size-3.5" />}>Send message</DropdownItem>
                <DropdownSeparator />
                <DropdownItem variant="danger">Delete</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </SectionRow>
        </div>

        <Divider />

        {/* align=start with label sections */}
        <div className="space-y-1.5">
          <SectionLabel>align=&quot;start&quot; · with DropdownLabel sections</SectionLabel>
          <SectionRow>
            <Dropdown align="start">
              <DropdownTrigger>
                <Button variant="secondary" rightIcon={<IconChevronDown className="size-3.5" />}>
                  Actions
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>Workspace</DropdownLabel>
                <DropdownItem icon={<IconSettings className="size-3.5" />}>Settings</DropdownItem>
                <DropdownItem icon={<IconBell className="size-3.5" />}>Notifications</DropdownItem>
                <DropdownSeparator />
                <DropdownLabel>Data</DropdownLabel>
                <DropdownItem icon={<IconFolder className="size-3.5" />}>Export</DropdownItem>
                <DropdownItem icon={<IconSearch className="size-3.5" />}>Audit log</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </SectionRow>
        </div>

        <Divider />

        {/* Custom trigger */}
        <div className="space-y-1.5">
          <SectionLabel>Custom trigger — any element as trigger</SectionLabel>
          <SectionRow>
            <Dropdown align="end">
              <DropdownTrigger>
                <div className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50">
                  <span className="flex size-5 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                    JD
                  </span>
                  <span className="font-medium">John Doe</span>
                  <IconChevronDown className="size-3 text-zinc-400" />
                </div>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>Account</DropdownLabel>
                <DropdownItem icon={<IconSettings className="size-3.5" />}>Profile settings</DropdownItem>
                <DropdownItem icon={<IconBell className="size-3.5" />}>Notifications</DropdownItem>
                <DropdownItem icon={<IconMessage className="size-3.5" />}>Support</DropdownItem>
                <DropdownSeparator />
                <DropdownItem icon={<IconLogOut className="size-3.5" />} variant="danger">
                  Sign out
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </SectionRow>
        </div>

        <Divider />

        {/* Disabled item */}
        <div className="space-y-1.5">
          <SectionLabel>Disabled item</SectionLabel>
          <SectionRow>
            <Dropdown align="end">
              <DropdownTrigger>
                <Button variant="secondary" rightIcon={<IconChevronDown className="size-3.5" />}>
                  More
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem icon={<IconFolder className="size-3.5" />}>Duplicate</DropdownItem>
                <DropdownItem icon={<IconSearch className="size-3.5" />} disabled>
                  Export (unavailable)
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem variant="danger">Remove</DropdownItem>
              </DropdownContent>
            </Dropdown>
          </SectionRow>
        </div>

      </CardContent>
    </Card>
  );
}

// ── Modal form field styles ───────────────────────────────────────────────────
// Mirror the Input component's visual style for use inside modal forms.

const inputCls =
  "h-8 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";

const selectCls =
  "h-8 w-full cursor-pointer appearance-none rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";

const textareaCls =
  "w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 transition-all duration-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10";

// ── Changelog data for scrolling demo ─────────────────────────────────────────

const CHANGELOG = [
  {
    version: "v2.4.0",
    date: "Apr 18, 2026",
    changes: [
      "Added DatePicker and DateRangePicker components.",
      "Modal now supports xl, full, and custom sizes.",
      "ModalContent scrolls internally when height is constrained.",
      "Dropdown trigger accepts any element via DropdownTrigger.",
    ],
  },
  {
    version: "v2.3.1",
    date: "Mar 28, 2026",
    changes: [
      "Fixed form field error state propagation to child inputs.",
      "Resolved scroll lock bug when opening nested modals.",
      "Switch component label now correctly aligns to all sizes.",
    ],
  },
  {
    version: "v2.3.0",
    date: "Mar 15, 2026",
    changes: [
      "Introduced MultiSelect with removable tag chips.",
      "SearchableSelect with debounced keyword filtering.",
      "Card list items support hover and active states.",
      "DataTable supports column alignment (left/right).",
    ],
  },
  {
    version: "v2.2.0",
    date: "Feb 27, 2026",
    changes: [
      "Added ProgressBar with labelled and unlabelled variants.",
      "StatCard component for KPI display in dashboards.",
      "ActivityFeed with relative timestamps.",
      "Badge now has four semantic color variants.",
    ],
  },
  {
    version: "v2.1.0",
    date: "Feb 10, 2026",
    changes: [
      "Sidebar with grouped sections, icons, and submenus.",
      "Collapsed sidebar shows icon-only mode.",
      "Submenus appear as floating popovers when collapsed.",
      "MainLayout wraps sidebar and page content.",
    ],
  },
];

// ── Size descriptions ──────────────────────────────────────────────────────────

type SizeOption = ModalSize | "custom";

const SIZE_OPTIONS: SizeOption[] = ["sm", "md", "lg", "xl", "full", "custom"];

const sizeLabel: Record<SizeOption, string> = {
  sm:     "SM",
  md:     "MD",
  lg:     "LG",
  xl:     "XL",
  full:   "Full",
  custom: "Custom",
};

const sizeDescription: Record<SizeOption, string> = {
  sm:     "max-w-sm · Compact. Best for confirmations and simple alerts.",
  md:     "max-w-md · Standard dialog. Used for most modals.",
  lg:     "max-w-lg · Wider dialog. Good for detail views and short forms.",
  xl:     "max-w-xl · Wide. Suited for tables, multi-column forms, or previews.",
  full:   "Fills the viewport. No overlay padding, no rounded corners.",
  custom: "width=\"80vw\" height=\"80vh\" — arbitrary CSS values via props.",
};

// ── Modal showcase ────────────────────────────────────────────────────────────

export function ModalShowcase() {
  const [infoOpen, setInfoOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [destructiveOpen, setDestructiveOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [openSize, setOpenSize] = useState<SizeOption | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [scrollOpen, setScrollOpen] = useState(false);

  // Derive Modal props from the selected size option
  const modalSize: ModalSize = openSize === "custom" || openSize === null ? "md" : openSize;
  const modalWidth  = openSize === "custom" ? "80vw" : undefined;
  const modalHeight = openSize === "custom" ? "80vh" : undefined;

  return (
    <Card flat>
      <CardHeader>
        <CardTitle>Modal</CardTitle>
        <span className="font-mono text-xs text-zinc-400">
          Header · Content · Footer · sizes · form · scroll
        </span>
      </CardHeader>
      <CardContent className="space-y-5">

        {/* Basic */}
        <div className="space-y-1.5">
          <SectionLabel>Basic — header + content + close</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setInfoOpen(true)}>Open modal</Button>
          </SectionRow>
          <Modal open={infoOpen} onClose={() => setInfoOpen(false)}>
            <ModalHeader>
              <ModalTitle>Workspace overview</ModalTitle>
            </ModalHeader>
            <ModalContent>
              <p>
                This workspace has{" "}
                <strong className="font-medium text-zinc-900">3 active members</strong> and{" "}
                <strong className="font-medium text-zinc-900">12 projects</strong>. Storage
                usage is at 42% of your plan limit.
              </p>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setInfoOpen(false)}>Close</Button>
            </ModalFooter>
          </Modal>
        </div>

        <Divider />

        {/* Confirm */}
        <div className="space-y-1.5">
          <SectionLabel>Confirm — cancel + confirm footer</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setConfirmOpen(true)}>Publish changes</Button>
          </SectionRow>
          <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)}>
            <ModalHeader>
              <ModalTitle>Publish to production?</ModalTitle>
            </ModalHeader>
            <ModalContent>
              <p>
                This will deploy the latest build to your production environment. All users
                will see the updated version immediately.
              </p>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setConfirmOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setConfirmOpen(false)}>Publish</Button>
            </ModalFooter>
          </Modal>
        </div>

        <Divider />

        {/* Destructive */}
        <div className="space-y-1.5">
          <SectionLabel>Destructive — danger action · closeOnOverlay=false</SectionLabel>
          <SectionRow>
            <Button variant="outline-secondary" onClick={() => setDestructiveOpen(true)}>
              Delete workspace
            </Button>
          </SectionRow>
          <Modal open={destructiveOpen} onClose={() => setDestructiveOpen(false)} closeOnOverlay={false}>
            <ModalHeader>
              <ModalTitle>Delete workspace</ModalTitle>
            </ModalHeader>
            <ModalContent>
              <p>
                This will permanently delete the workspace, all its projects, and remove all
                member access.{" "}
                <strong className="font-medium text-zinc-900">This action cannot be undone.</strong>
              </p>
              <p className="mt-3 text-xs text-zinc-400">
                Backdrop click is disabled — you must use a button to close.
              </p>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setDestructiveOpen(false)}>Cancel</Button>
              <Button
                variant="primary"
                className="bg-red-600 hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500/30"
                onClick={() => setDestructiveOpen(false)}
              >
                Delete workspace
              </Button>
            </ModalFooter>
          </Modal>
        </div>

        <Divider />

        {/* ConfirmModal */}
        <div className="space-y-1.5">
          <SectionLabel>ConfirmModal — pre-composed destructive dialog</SectionLabel>
          <SectionRow>
            <Button variant="outline-secondary" onClick={() => setConfirmModalOpen(true)}>
              Delete project
            </Button>
          </SectionRow>
          <ConfirmModal
            open={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onConfirm={() => setConfirmModalOpen(false)}
            title="Delete project"
            description={
              <>
                This will permanently delete the project and all its data.{" "}
                <strong className="font-medium text-zinc-900">
                  This action cannot be undone.
                </strong>
              </>
            }
            confirmLabel="Delete project"
          />
        </div>

        <Divider />

        {/* All sizes */}
        <div className="space-y-1.5">
          <SectionLabel>Sizes — sm · md · lg · xl · full · custom</SectionLabel>
          <SectionRow>
            {SIZE_OPTIONS.map((s) => (
              <Button key={s} variant="secondary" onClick={() => setOpenSize(s)}>
                {sizeLabel[s]}
              </Button>
            ))}
          </SectionRow>
          <Modal
            open={openSize !== null}
            onClose={() => setOpenSize(null)}
            size={modalSize}
            width={modalWidth}
            height={modalHeight}
          >
            <ModalHeader>
              <ModalTitle>{openSize ? sizeLabel[openSize] : ""} modal</ModalTitle>
            </ModalHeader>
            <ModalContent>
              <p className="mb-2 font-mono text-xs text-indigo-600">
                {openSize === "custom"
                  ? `width="80vw" height="80vh"`
                  : `size="${openSize}"`}
              </p>
              <p>{openSize ? sizeDescription[openSize] : ""}</p>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setOpenSize(null)}>Close</Button>
            </ModalFooter>
          </Modal>
        </div>

        <Divider />

        {/* Form layout */}
        <div className="space-y-1.5">
          <SectionLabel>Form layout — size=&quot;lg&quot; · invite member</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>Invite member</Button>
          </SectionRow>
          <Modal open={formOpen} onClose={() => setFormOpen(false)} size="lg">
            <ModalHeader>
              <ModalTitle>Invite team member</ModalTitle>
              <p className="mt-0.5 text-xs text-zinc-500">
                They will receive an invitation email with setup instructions.
              </p>
            </ModalHeader>
            <ModalContent>
              <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>

                {/* Row 1 — name + email */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600">
                      Full name <span className="text-red-500">*</span>
                    </label>
                    <input placeholder="Jane Smith" className={inputCls} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600">
                      Email address <span className="text-red-500">*</span>
                    </label>
                    <input type="email" placeholder="jane@company.com" className={inputCls} />
                  </div>
                </div>

                {/* Row 2 — role + department */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600">
                      Role <span className="text-red-500">*</span>
                    </label>
                    <select defaultValue="" className={selectCls}>
                      <option value="" disabled>Select a role…</option>
                      <option value="admin">Admin</option>
                      <option value="editor">Editor</option>
                      <option value="viewer">Viewer</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-600">Department</label>
                    <input placeholder="e.g. Engineering" className={inputCls} />
                  </div>
                </div>

                <div className="h-px bg-zinc-100" />

                {/* Welcome message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-600">Welcome message</label>
                  <textarea
                    rows={3}
                    placeholder="Add a personal note to the invitation email…"
                    className={textareaCls}
                  />
                  <p className="text-[11px] text-zinc-400">Optional. Plain text only.</p>
                </div>

                {/* Notifications */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-600">Notifications</p>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      defaultChecked
                      className="size-3.5 rounded border-zinc-300 accent-indigo-600"
                    />
                    Send onboarding email
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-700">
                    <input
                      type="checkbox"
                      className="size-3.5 rounded border-zinc-300 accent-indigo-600"
                    />
                    Notify team in Slack
                  </label>
                </div>

              </form>
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setFormOpen(false)}>Cancel</Button>
              <Button variant="primary" onClick={() => setFormOpen(false)}>Send invitation</Button>
            </ModalFooter>
          </Modal>
        </div>

        <Divider />

        {/* Scrolling content */}
        <div className="space-y-1.5">
          <SectionLabel>Scrolling content — fixed height · header and footer pinned</SectionLabel>
          <SectionRow>
            <Button variant="secondary" onClick={() => setScrollOpen(true)}>View changelog</Button>
          </SectionRow>
          <Modal open={scrollOpen} onClose={() => setScrollOpen(false)} size="sm" height="420px">
            <ModalHeader>
              <ModalTitle>Changelog</ModalTitle>
            </ModalHeader>
            <ModalContent>
              {CHANGELOG.map((entry) => (
                <div
                  key={entry.version}
                  className="mb-4 border-b border-zinc-100 pb-4 last:mb-0 last:border-0 last:pb-0"
                >
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-zinc-900">{entry.version}</span>
                    <span className="text-[11px] text-zinc-400">{entry.date}</span>
                  </div>
                  <ul className="space-y-1">
                    {entry.changes.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-600">
                        <span className="mt-px shrink-0 text-zinc-300">·</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </ModalContent>
            <ModalFooter>
              <Button variant="secondary" onClick={() => setScrollOpen(false)}>Close</Button>
            </ModalFooter>
          </Modal>
        </div>

      </CardContent>
    </Card>
  );
}
