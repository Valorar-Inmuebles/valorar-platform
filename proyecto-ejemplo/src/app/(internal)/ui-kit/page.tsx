import MainLayout from "@/components/layout/MainLayout";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ContextIcon } from "@/components/ui/context-icon";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardHeaderActions,
  CardList,
  CardListItem,
  CardMenu,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import {
  ErrorMessage,
  FormField,
  HelperText,
  Label,
} from "@/components/ui/form-field";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Radio } from "@/components/ui/radio";
import { Switch } from "@/components/ui/switch";
import {
  IconBell,
  IconChart,
  IconChevronDown,
  IconChevronRight,
  IconDatabase,
  IconFolder,
  IconLayout,
  IconMenu,
  IconMessage,
  IconSearch,
  IconSettings,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { SelectShowcase } from "@/app/(internal)/ui-kit/select-showcase";
import { FormValidationShowcase, CurrencyInputShowcase } from "@/app/(internal)/ui-kit/form-showcase";
import { InputGroupShowcase } from "@/app/(internal)/ui-kit/input-group-showcase";
import { FormattedInputsShowcase } from "@/app/(internal)/ui-kit/formatted-inputs-showcase";
import { ToastShowcase } from "@/app/(internal)/ui-kit/toast-showcase";
import { DatePickerShowcase } from "@/app/(internal)/ui-kit/date-picker-showcase";
import { DropdownShowcase, ModalShowcase } from "@/app/(internal)/ui-kit/dropdown-modal-showcase";
import { SidePanelShowcase } from "@/app/(internal)/ui-kit/side-panel-showcase";
import {
  Table,
  TableHeader,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { FullDataSurfaceShowcase, SortableTableShowcase, TableFilterShowcase, PaginatedTableShowcase, ColumnVisibilityShowcase, GlobalSearchShowcase, FilteredTableShowcase, RowSelectionShowcase } from "@/app/(internal)/ui-kit/table-showcase";
import { TableReorderControlsShowcase } from "@/app/(internal)/ui-kit/table-reorder-showcase";
import { WorkflowEtapaCardBorderShowcase } from "@/app/(internal)/ui-kit/workflow-etapa-card-border-showcase";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton, SkeletonCard, SkeletonTable } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

// ── Table card demo data ──────────────────────────────────────────────────────

type InvoiceRow = {
  id: string;
  number: string;
  customer: string;
  amount: string;
  status: "paid" | "pending" | "overdue";
};

const INVOICES: InvoiceRow[] = [
  { id: "1", number: "#4821", customer: "Acme Corp",  amount: "$1,200", status: "paid"    },
  { id: "2", number: "#4820", customer: "Globex Inc", amount: "$299",   status: "pending" },
  { id: "3", number: "#4819", customer: "Initech",    amount: "$499",   status: "overdue" },
];

const invoiceStatusVariant: Record<
  InvoiceRow["status"],
  "success" | "warning" | "danger"
> = { paid: "success", pending: "warning", overdue: "danger" };

const INVOICE_COLS: TableColumn<InvoiceRow>[] = [
  {
    key: "number",
    header: "Invoice",
    render: (r) => (
      <span className="font-medium text-zinc-900">{r.number}</span>
    ),
  },
  { key: "customer", header: "Customer", render: (r) => r.customer },
  {
    key: "amount",
    header: "Amount",
    align: "right",
    render: (r) => <span className="tabular-nums">{r.amount}</span>,
  },
  {
    key: "status",
    header: "Status",
    align: "right",
    render: (r) => (
      <Badge variant={invoiceStatusVariant[r.status]}>{r.status}</Badge>
    ),
  },
];

// ── Table demo data ───────────────────────────────────────────────────────────

type MemberRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  joined: string;
};

const MEMBERS: MemberRow[] = [
  { id: "1", name: "Alice Martin", email: "alice@example.com", role: "Admin",  joined: "Jan 2024" },
  { id: "2", name: "Bob Chen",     email: "bob@example.com",   role: "Editor", joined: "Mar 2024" },
  { id: "3", name: "Carol James",  email: "carol@example.com", role: "Viewer", joined: "Jun 2024" },
  { id: "4", name: "David Park",   email: "david@example.com", role: "Editor", joined: "Aug 2024" },
];

type ProjectRow = {
  id: string;
  name: string;
  owner: string;
  due: string;
  status: "active" | "review" | "done" | "blocked";
};

const PROJECTS: ProjectRow[] = [
  { id: "1", name: "Redesign homepage",    owner: "Alice Martin", due: "Apr 30", status: "active"  },
  { id: "2", name: "API v2 migration",     owner: "Bob Chen",     due: "May 15", status: "review"  },
  { id: "3", name: "Analytics ",  owner: "Carol James",  due: "Mar 20", status: "done"    },
  { id: "4", name: "Auth refactor",        owner: "David Park",   due: "Jun 1",  status: "blocked" },
];

const projectStatusVariant: Record<
  ProjectRow["status"],
  "success" | "warning" | "danger" | "neutral"
> = { active: "neutral", review: "warning", done: "success", blocked: "danger" };

type UserRow = { id: string; name: string; email: string; role: string };

const USERS: UserRow[] = [
  { id: "1", name: "Alice Martin", email: "alice@example.com", role: "Admin"  },
  { id: "2", name: "Bob Chen",     email: "bob@example.com",   role: "Editor" },
  { id: "3", name: "Carol James",  email: "carol@example.com", role: "Viewer" },
];

// ─────────────────────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-medium text-zinc-400">{children}</p>;
}

function SectionRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

function Divider() {
  return <div className="h-px bg-zinc-100" />;
}

export default function UIKitPage() {
  return (
    <MainLayout>
      <div className="space-y-8">

        {/* Header */}
        <header className="space-y-1.5">
          <h1 className="text-base font-medium tracking-tight text-zinc-900">UI Kit</h1>
          <p className="text-sm text-zinc-500">
            All reusable primitives from <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs text-zinc-700">/components/ui</code>.
          </p>
        </header>

        {/* ── Buttons ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Button</CardTitle>
            <span className="font-mono text-xs text-zinc-400">variant · size · icons · loading · disabled</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Variants</SectionLabel>
              <SectionRow>
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="outline-primary">Outline primary</Button>
                <Button variant="outline-secondary">Outline secondary</Button>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Sizes</SectionLabel>
              <SectionRow>
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Left icon</SectionLabel>
              <SectionRow>
                <Button variant="primary" leftIcon={<IconBell className="size-3.5" />}>Notifications</Button>
                <Button variant="secondary" leftIcon={<IconSearch className="size-3.5" />}>Search</Button>
                <Button variant="ghost" leftIcon={<IconSettings className="size-3.5" />}>Settings</Button>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Right icon</SectionLabel>
              <SectionRow>
                <Button variant="primary" rightIcon={<IconChevronDown className="size-3.5" />}>Menu</Button>
                <Button variant="outline-primary" rightIcon={<IconChevronRight className="size-3.5" />}>Continue</Button>
                <Button variant="secondary" rightIcon={<IconChevronDown className="size-3.5" />}>Options</Button>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Loading</SectionLabel>
              <SectionRow>
                <Button variant="primary" loading>Saving…</Button>
                <Button variant="secondary" loading>Loading</Button>
                <Button variant="outline-primary" loading>Processing</Button>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Disabled</SectionLabel>
              <SectionRow>
                <Button variant="primary" disabled>Primary</Button>
                <Button variant="secondary" disabled>Secondary</Button>
                <Button variant="ghost" disabled>Ghost</Button>
                <Button variant="outline-primary" disabled>Outline primary</Button>
                <Button variant="outline-secondary" disabled>Outline secondary</Button>
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Loading ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Loading</CardTitle>
            <span className="font-mono text-xs text-zinc-400">Spinner · Skeleton · Button loading</span>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Spinner sizes */}
            <div className="space-y-1.5">
              <SectionLabel>Spinner — sizes</SectionLabel>
              <SectionRow>
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </SectionRow>
            </div>

            <Divider />

            {/* Spinner colors */}
            <div className="space-y-1.5">
              <SectionLabel>Spinner — colors via className</SectionLabel>
              <SectionRow>
                <Spinner size="md" className="text-zinc-400" />
                <Spinner size="md" className="text-indigo-500" />
                <Spinner size="md" className="text-emerald-500" />
                <Spinner size="md" className="text-red-500" />
              </SectionRow>
            </div>

            <Divider />

            {/* Button loading (cross-ref) */}
            <div className="space-y-1.5">
              <SectionLabel>Button — loading state</SectionLabel>
              <SectionRow>
                <Button variant="primary" loading>Saving…</Button>
                <Button variant="secondary" loading>Loading</Button>
                <Button variant="outline-primary" loading>Processing</Button>
                <Button size="sm" loading>Small</Button>
                <Button size="lg" loading>Large</Button>
              </SectionRow>
            </div>

            <Divider />

            {/* Skeleton base */}
            <div className="space-y-1.5">
              <SectionLabel>Skeleton — base blocks</SectionLabel>
              <div className="space-y-2 max-w-sm">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-4/5" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>

            <Divider />

            {/* Skeleton card */}
            <div className="space-y-1.5">
              <SectionLabel>Skeleton — card</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </div>

            <Divider />

            {/* Skeleton table */}
            <div className="space-y-1.5">
              <SectionLabel>Skeleton — table</SectionLabel>
              <SkeletonTable rows={4} columns={4} />
            </div>

          </CardContent>
        </Card>

        {/* ── Empty State ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>EmptyState</CardTitle>
            <span className="font-mono text-xs text-zinc-400">title · description · action · icon</span>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-1.5">
              <SectionLabel>Title only</SectionLabel>
              <EmptyState title="No results found" />
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>Title + description</SectionLabel>
              <EmptyState
                title="No projects yet"
                description="Projects you create will appear here."
              />
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>With action</SectionLabel>
              <EmptyState
                title="No team members"
                description="Invite people to collaborate on your workspace."
                action={<Button size="sm">Invite member</Button>}
              />
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>With icon + action</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <EmptyState
                  title="No notifications"
                  description="You're all caught up."
                  icon={<IconBell className="size-4" />}
                />
                <EmptyState
                  title="No messages"
                  description="Start a conversation to see messages here."
                  icon={<IconMessage className="size-4" />}
                  action={<Button size="sm" variant="secondary">New message</Button>}
                />
                <EmptyState
                  title="No data"
                  description="Connect a source to start seeing analytics."
                  icon={<IconChart className="size-4" />}
                  action={<Button size="sm" variant="outline-primary">Connect source</Button>}
                />
              </div>
            </div>

          </CardContent>
        </Card>

        {/* ── Icon Button ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>IconButton</CardTitle>
            <span className="font-mono text-xs text-zinc-400">variant · disabled</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Variants</SectionLabel>
              <SectionRow>
                <IconButton variant="ghost" aria-label="Ghost bell">
                  <IconBell className="size-4" />
                </IconButton>
                <IconButton variant="subtle" aria-label="Subtle bell">
                  <IconBell className="size-4" />
                </IconButton>
                <IconButton variant="ghost" aria-label="Ghost message">
                  <IconMessage className="size-4" />
                </IconButton>
                <IconButton variant="subtle" aria-label="Subtle message">
                  <IconMessage className="size-4" />
                </IconButton>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Disabled</SectionLabel>
              <SectionRow>
                <IconButton disabled aria-label="Disabled ghost">
                  <IconBell className="size-4" />
                </IconButton>
                <IconButton variant="subtle" disabled aria-label="Disabled subtle">
                  <IconBell className="size-4" />
                </IconButton>
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Badge ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Badge</CardTitle>
            <span className="font-mono text-xs text-zinc-400">variant</span>
          </CardHeader>
          <CardContent>
            <SectionRow>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="danger">Danger</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </SectionRow>
          </CardContent>
        </Card>

        {/* ── ContextIcon ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>ContextIcon</CardTitle>
            <span className="font-mono text-xs text-zinc-400">tone · size · workspace headers</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Tones</SectionLabel>
              <SectionRow>
                <ContextIcon tone="primary"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="info"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="success"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="warning"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="danger"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="neutral"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="violet"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="amber"><IconFolder className="size-4" /></ContextIcon>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Sizes</SectionLabel>
              <SectionRow>
                <ContextIcon tone="primary" size="xs"><IconFolder className="size-3.5" /></ContextIcon>
                <ContextIcon tone="primary" size="sm"><IconFolder className="size-4" /></ContextIcon>
                <ContextIcon tone="primary" size="md"><IconFolder className="size-5" /></ContextIcon>
                <ContextIcon tone="primary" size="lg"><IconFolder className="size-6" /></ContextIcon>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Usage — section header</SectionLabel>
              <div className="flex items-start gap-3">
                <ContextIcon tone="primary" size="md">
                  <IconFolder className="size-5" />
                </ContextIcon>
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-semibold text-gray-900">EXP-2025-000123</p>
                  <p className="text-xs text-gray-500">Pérez, Marta Alicia / Reajuste de haberes</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Input ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <span className="font-mono text-xs text-zinc-400">state · icons · label · hint · disabled</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>States</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input
                  id="input-default"
                  label="Default"
                  placeholder="Placeholder…"
                  hint="Helper text"
                />
                <Input
                  id="input-error"
                  label="Error"
                  state="error"
                  defaultValue="bad-input"
                  hint="This field is required"
                />
                <Input
                  id="input-success"
                  label="Success"
                  state="success"
                  defaultValue="valid@email.com"
                  hint="Looks good"
                />
                <Input
                  id="input-disabled"
                  label="Disabled"
                  disabled
                  placeholder="Not editable"
                  hint="Read-only field"
                />
              </div>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>With icons</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Input
                  id="input-left-icon"
                  label="Left icon"
                  leftIcon={<IconSearch className="size-3.5" />}
                  placeholder="Search…"
                />
                <Input
                  id="input-right-icon"
                  label="Right icon"
                  rightIcon={<IconSettings className="size-3.5" />}
                  placeholder="Username"
                />
                <Input
                  id="input-both-icons"
                  label="Both icons"
                  leftIcon={<IconSearch className="size-3.5" />}
                  rightIcon={<IconMessage className="size-3.5" />}
                  placeholder="Search messages…"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── CurrencyInput ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>CurrencyInput</CardTitle>
            <span className="font-mono text-xs text-zinc-400">ARS · $ 1.000,00 · controlled · states</span>
          </CardHeader>
          <CardContent>
            <CurrencyInputShowcase />
          </CardContent>
        </Card>

        {/* ── Formatted Inputs ── */}
        <FormattedInputsShowcase />

        {/* ── InputGroup / InputAffix ── */}
        <InputGroupShowcase />


        {/* ── Selects ── */}
        <SelectShowcase />

        {/* ── Date Pickers ── */}
        <DatePickerShowcase />

        {/* ── Form Fields ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Form Fields</CardTitle>
            <span className="font-mono text-xs text-zinc-400">FormField · Label · HelperText · ErrorMessage</span>
          </CardHeader>
          <CardContent className="space-y-5">

            <div className="space-y-1.5">
              <SectionLabel>Label</SectionLabel>
              <div className="flex flex-wrap items-baseline gap-4">
                <Label htmlFor="demo-plain">Plain label</Label>
                <Label htmlFor="demo-req" required>Required label</Label>
                <Label htmlFor="demo-disabled" className="opacity-40">Disabled label</Label>
              </div>
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>HelperText</SectionLabel>
              <HelperText>Use up to 160 characters. Markdown is not supported.</HelperText>
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>ErrorMessage</SectionLabel>
              <ErrorMessage>This field is required.</ErrorMessage>
              <ErrorMessage>Email address is not valid.</ErrorMessage>
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>Composed — default</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField>
                  <Label>Full name</Label>
                  <Input placeholder="Jane Smith" />
                  <HelperText>As it appears on your ID.</HelperText>
                </FormField>
                <FormField>
                  <Label required>Email</Label>
                  <Input placeholder="jane@example.com" />
                  <HelperText>We'll never share your email.</HelperText>
                </FormField>
                <FormField>
                  <Label>Website</Label>
                  <Input placeholder="https://example.com" disabled />
                  <HelperText>Optional. Include https://</HelperText>
                </FormField>
              </div>
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>Composed — error &amp; success</SectionLabel>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField state="error">
                  <Label required>Username</Label>
                  <Input defaultValue="ab" />
                  <ErrorMessage>Must be at least 3 characters.</ErrorMessage>
                </FormField>
                <FormField state="error">
                  <Label required>Password</Label>
                  <Input type="password" defaultValue="123" />
                  <ErrorMessage>Password is too weak.</ErrorMessage>
                </FormField>
                <FormField state="success">
                  <Label required>Email</Label>
                  <Input defaultValue="jane@example.com" />
                  <HelperText>Looks good!</HelperText>
                </FormField>
              </div>
            </div>

            <Divider />

            <div className="space-y-1.5">
              <SectionLabel>Validation — live · useField hook · loading state</SectionLabel>
              <FormValidationShowcase />
            </div>

          </CardContent>
        </Card>

        {/* ── Search Input ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>SearchInput</CardTitle>
            <span className="font-mono text-xs text-zinc-400">controlled search field</span>
          </CardHeader>
          <CardContent>
            <SearchInput placeholder="Search workspace…" aria-label="Search" />
          </CardContent>
        </Card>

        {/* ── Checkbox ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Checkbox</CardTitle>
            <span className="font-mono text-xs text-zinc-400">size · checked · disabled · label</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Sizes — unchecked</SectionLabel>
              <SectionRow>
                <Checkbox size="sm" />
                <Checkbox size="md" />
                <Checkbox size="lg" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Sizes — checked</SectionLabel>
              <SectionRow>
                <Checkbox size="sm" defaultChecked />
                <Checkbox size="md" defaultChecked />
                <Checkbox size="lg" defaultChecked />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>With label</SectionLabel>
              <SectionRow>
                <Checkbox size="sm" label="Small" />
                <Checkbox size="md" label="Medium" defaultChecked />
                <Checkbox size="lg" label="Large" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Disabled</SectionLabel>
              <SectionRow>
                <Checkbox size="md" label="Unchecked" disabled />
                <Checkbox size="md" label="Checked" defaultChecked disabled />
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Radio ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Radio</CardTitle>
            <span className="font-mono text-xs text-zinc-400">size · group · disabled · label</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Sizes</SectionLabel>
              <SectionRow>
                <Radio size="sm" name="radio-sizes" />
                <Radio size="md" name="radio-sizes" defaultChecked />
                <Radio size="lg" name="radio-sizes" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Radio group with labels</SectionLabel>
              <SectionRow>
                <Radio size="md" name="radio-plan" value="starter" label="Starter" />
                <Radio size="md" name="radio-plan" value="pro"     label="Pro" defaultChecked />
                <Radio size="md" name="radio-plan" value="biz"     label="Business" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Disabled</SectionLabel>
              <SectionRow>
                <Radio size="md" name="radio-disabled" label="Unselected" disabled />
                <Radio size="md" name="radio-disabled" label="Selected"   defaultChecked disabled />
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Switch ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Switch</CardTitle>
            <span className="font-mono text-xs text-zinc-400">size · checked · disabled · label</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Sizes — off</SectionLabel>
              <SectionRow>
                <Switch size="sm" />
                <Switch size="md" />
                <Switch size="lg" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Sizes — on</SectionLabel>
              <SectionRow>
                <Switch size="sm" defaultChecked />
                <Switch size="md" defaultChecked />
                <Switch size="lg" defaultChecked />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>With label</SectionLabel>
              <SectionRow>
                <Switch size="sm" label="Small" />
                <Switch size="md" label="Medium" defaultChecked />
                <Switch size="lg" label="Large" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>Disabled</SectionLabel>
              <SectionRow>
                <Switch size="md" label="Off"  disabled />
                <Switch size="md" label="On"   defaultChecked disabled />
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Avatar ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <span className="font-mono text-xs text-zinc-400">size</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>Sizes</SectionLabel>
              <SectionRow>
                <Avatar usuarioId="" name="Alex Morgan" size="sm" />
                <Avatar usuarioId="" name="Alex Morgan" size="md" />
                <Avatar usuarioId="" name="Alex Morgan" size="lg" />
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>With different initials</SectionLabel>
              <SectionRow>
                <Avatar usuarioId="" name="John Doe" size="md" />
                <Avatar usuarioId="" name="Sam" size="md" />
                <Avatar usuarioId="" name="React Developer" size="md" />
                <Avatar usuarioId="" name="Z" size="md" />
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Card ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Card</CardTitle>
            <span className="font-mono text-xs text-zinc-400">flat · default</span>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <Card flat>
                <CardHeader>
                  <CardTitle>Flat card</CardTitle>
                  <Badge variant="neutral">flat</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">Border only, no shadow or hover lift. Used for nested sections.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Default card</CardTitle>
                  <Badge variant="neutral">default</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">Subtle shadow + hover lift. Used for top-level surfaces.</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* ── Card variants ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Card variants</CardTitle>
            <span className="font-mono text-xs text-zinc-400">
              header actions · menu · footer · list · table
            </span>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Header with actions */}
            <div className="space-y-1.5">
              <SectionLabel>Header with actions</SectionLabel>
              <Card flat>
                <CardHeader>
                  <CardTitle>Workspace settings</CardTitle>
                  <CardHeaderActions>
                    <Button variant="secondary" size="sm">Cancel</Button>
                    <Button size="sm">Save changes</Button>
                  </CardHeaderActions>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    Multiple header buttons grouped with <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700">CardHeaderActions</code>.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Divider />

            {/* Dropdown menu (3 dots) */}
            <div className="space-y-1.5">
              <SectionLabel>Dropdown menu (3 dots)</SectionLabel>
              <Card flat>
                <CardHeader>
                  <CardTitle>Team member</CardTitle>
                  <CardMenu>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Remove
                    </DropdownMenuItem>
                  </CardMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    Overflow menu rendered via <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-xs text-zinc-700">CardMenu</code> — click the ⋯ button.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Divider />

            {/* Footer actions */}
            <div className="space-y-1.5">
              <SectionLabel>Footer actions</SectionLabel>
              <Card flat>
                <CardContent>
                  <p className="text-sm text-zinc-500">
                    This will permanently delete the workspace and all its data. This action cannot be undone.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button variant="secondary" size="sm">Cancel</Button>
                  <Button variant="primary" size="sm">Confirm</Button>
                </CardFooter>
              </Card>
            </div>

            <Divider />

            {/* List card */}
            <div className="space-y-1.5">
              <SectionLabel>List card</SectionLabel>
              <Card flat>
                <CardHeader>
                  <CardTitle>Active integrations</CardTitle>
                  <Badge variant="neutral">3</Badge>
                </CardHeader>
                <CardList>
                  <CardListItem>
                    <span className="text-zinc-700">Stripe</span>
                    <Badge variant="success">Connected</Badge>
                  </CardListItem>
                  <CardListItem>
                    <span className="text-zinc-700">GitHub</span>
                    <Badge variant="success">Connected</Badge>
                  </CardListItem>
                  <CardListItem>
                    <span className="text-zinc-700">Slack</span>
                    <Badge variant="warning">Pending</Badge>
                  </CardListItem>
                </CardList>
              </Card>
            </div>

          </CardContent>
        </Card>

        {/* ── Dropdown ── */}
        <DropdownShowcase />

        {/* ── Modal ── */}
        <ModalShowcase />

        {/* ── SidePanel ── */}
        <SidePanelShowcase />

        {/* ── DropdownMenu (legacy) ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>DropdownMenu</CardTitle>
            <span className="font-mono text-xs text-zinc-400">align · separator · items</span>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <SectionLabel>align=&quot;end&quot; (default)</SectionLabel>
              <SectionRow>
                <DropdownMenu align="end">
                  <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors duration-150 hover:bg-zinc-50 hover:text-zinc-900">
                    Options
                    <IconChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Edit</DropdownMenuItem>
                    <DropdownMenuItem>Duplicate</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700">
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SectionRow>
            </div>
            <Divider />
            <div className="space-y-1.5">
              <SectionLabel>align=&quot;start&quot;</SectionLabel>
              <SectionRow>
                <DropdownMenu align="start">
                  <DropdownMenuTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-zinc-600 transition-colors duration-150 hover:bg-zinc-100 hover:text-zinc-900">
                    Actions
                    <IconChevronDown className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>View details</DropdownMenuItem>
                    <DropdownMenuItem>Export CSV</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Archive</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SectionRow>
            </div>
          </CardContent>
        </Card>

        {/* ── Table ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Table</CardTitle>
            <span className="font-mono text-xs text-zinc-400">TableSurface · TableToolbar · TableFooter · TableCell</span>
          </CardHeader>
          <CardContent className="space-y-5">

            {/* Full data surface — flagship showcase */}
            <div className="space-y-2">
              <SectionLabel>Data surface completa — toolbar · sort · selección · acciones · footer</SectionLabel>
              <FullDataSurfaceShowcase />
            </div>

            <Divider />

            {/* DataTable — columnar, no surface wrapper */}
            <div className="space-y-2">
              <SectionLabel>DataTable — superficie de datos sin toolbar</SectionLabel>
              <div className="flex items-center justify-between py-1">
                <span className="text-sm font-medium text-zinc-700">Facturas recientes</span>
                <Button variant="ghost" size="sm">Exportar</Button>
              </div>
              <DataTable
                columns={INVOICE_COLS}
                rows={INVOICES}
                getRowKey={(r) => r.id}
                caption="Facturas recientes"
              />
            </div>

            <Divider />

            {/* Basic */}
            <div className="space-y-1.5">
              <SectionLabel>Básica</SectionLabel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>Nombre</TableCell>
                    <TableCell isHeader>Email</TableCell>
                    <TableCell isHeader>Rol</TableCell>
                    <TableCell isHeader>Fecha</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {MEMBERS.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium text-zinc-900">{m.name}</TableCell>
                      <TableCell>{m.email}</TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell>{m.joined}</TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>

            <Divider />

            {/* Status badges */}
            <div className="space-y-1.5">
              <SectionLabel>Con badges de estado</SectionLabel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>Proyecto</TableCell>
                    <TableCell isHeader>Responsable</TableCell>
                    <TableCell isHeader>Vencimiento</TableCell>
                    <TableCell isHeader align="right">Estado</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {PROJECTS.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium text-zinc-900">{p.name}</TableCell>
                      <TableCell>{p.owner}</TableCell>
                      <TableCell>{p.due}</TableCell>
                      <TableCell align="right">
                        <Badge variant={projectStatusVariant[p.status]}>{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>

            <Divider />

            {/* Actions column — "..." menu only */}
            <div className="space-y-1.5">
              <SectionLabel>Con columna de acciones — menú &ldquo;…&rdquo;</SectionLabel>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell isHeader>Nombre</TableCell>
                    <TableCell isHeader>Email</TableCell>
                    <TableCell isHeader>Rol</TableCell>
                    <TableCell isHeader sticky className="w-px whitespace-nowrap">Acciones</TableCell>
                  </TableRow>
                </TableHeader>
                <tbody>
                  {USERS.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-zinc-900">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>{u.role}</TableCell>
                      <TableCell sticky className="w-px whitespace-nowrap">
                        <DropdownMenu align="end">
                          <DropdownMenuTrigger className="flex size-7 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
                            <svg viewBox="0 0 16 16" fill="currentColor" className="size-4" aria-hidden>
                              <circle cx="3" cy="8" r="1.25" />
                              <circle cx="8" cy="8" r="1.25" />
                              <circle cx="13" cy="8" r="1.25" />
                            </svg>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Ver detalle</DropdownMenuItem>
                            <DropdownMenuItem>Editar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 hover:bg-red-50 hover:text-red-700">
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </tbody>
              </Table>
            </div>

            <Divider />

            {/* Sortable columns */}
            <div className="space-y-1.5">
              <SectionLabel>Columnas ordenables</SectionLabel>
              <SortableTableShowcase />
            </div>

            <Divider />

            {/* Search filter */}
            <div className="space-y-1.5">
              <SectionLabel>Con búsqueda integrada</SectionLabel>
              <TableFilterShowcase />
            </div>

            <Divider />

            {/* Global search */}
            <div className="space-y-1.5">
              <SectionLabel>Búsqueda global + conteo</SectionLabel>
              <GlobalSearchShowcase />
            </div>

            <Divider />

            {/* Pagination integrated */}
            <div className="space-y-1.5">
              <SectionLabel>Con footer de paginación integrado</SectionLabel>
              <PaginatedTableShowcase />
            </div>

            <Divider />

            {/* Column visibility */}
            <div className="space-y-1.5">
              <SectionLabel>Visibilidad de columnas</SectionLabel>
              <ColumnVisibilityShowcase />
            </div>

            <Divider />

            {/* Filters */}
            <div className="space-y-1.5">
              <SectionLabel>Filtros — estado · rango de fechas · búsqueda</SectionLabel>
              <FilteredTableShowcase />
            </div>

            <Divider />

            {/* Table reorder controls */}
            <div className="space-y-1.5">
              <SectionLabel>Table Reorder Controls</SectionLabel>
              <TableReorderControlsShowcase />
            </div>

            <Divider />

            {/* Workflow etapa card borders — UX experiment */}
            <div className="space-y-1.5">
              <SectionLabel>Workflow — Etapa card Paso 6</SectionLabel>
              <WorkflowEtapaCardBorderShowcase />
            </div>

            <Divider />

            {/* Row selection */}
            <div className="space-y-1.5">
              <SectionLabel>Selección de filas — checkbox · seleccionar todo · indeterminado</SectionLabel>
              <RowSelectionShowcase />
            </div>

          </CardContent>
        </Card>

        {/* ── Toast ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Toast</CardTitle>
            <span className="font-mono text-xs text-zinc-400">success · error · info · warning</span>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              <ToastShowcase />
            </div>
          </CardContent>
        </Card>

        {/* ── Icons ── */}
        <Card flat>
          <CardHeader>
            <CardTitle>Icons</CardTitle>
            <span className="font-mono text-xs text-zinc-400">SVG · stroke · currentColor</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(7rem,1fr))] gap-px overflow-hidden rounded-lg border border-zinc-100">
              {[
                { label: "Layout",        Icon: IconLayout },
                { label: "Folder",        Icon: IconFolder },
                { label: "Database",      Icon: IconDatabase },
                { label: "Chart",         Icon: IconChart },
                { label: "Settings",      Icon: IconSettings },
                { label: "Menu",          Icon: IconMenu },
                { label: "Search",        Icon: IconSearch },
                { label: "Bell",          Icon: IconBell },
                { label: "Message",       Icon: IconMessage },
                { label: "ChevronDown",   Icon: IconChevronDown },
                { label: "ChevronRight",  Icon: IconChevronRight },
              ].map(({ label, Icon }) => (
                <div
                  key={label}
                  className="flex flex-col items-center gap-2 bg-white px-3 py-4 hover:bg-zinc-50"
                >
                  <Icon className="size-5 text-zinc-500" />
                  <span className="font-mono text-[10px] text-zinc-400">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </MainLayout>
  );
}
