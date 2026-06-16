import MainLayout from "@/components/layout/MainLayout";
import { mainLayoutCurrentUser } from "@/lib/auth/main-layout-user";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { requireAuth } from "@/lib/auth/require-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard, type StatCardProps } from "@/components/ui/stat-card";
import { DataTable, type TableColumn } from "@/components/ui/data-table";
import { ActivityFeed, type ActivityItem } from "@/components/ui/activity-feed";
import { ProgressBar, type ProgressBarColor } from "@/components/ui/progress-bar";
import { SectionHeader } from "@/components/ui/section-header";

// ── Data ──────────────────────────────────────────────────────────────────────

const kpis: StatCardProps[] = [
  { label: "Active users", value: "12,480", delta: "+3.2%", trend: "positive" },
  { label: "MRR", value: "$284k", delta: "+1.1%", trend: "positive" },
  { label: "Churn rate", value: "0.8%", delta: "−0.2%", trend: "positive" },
  { label: "API errors", value: "42", delta: "−18%", trend: "positive" },
];

type CustomerRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: "active" | "trial" | "churned";
  mrr: string;
  joined: string;
};

const customers: CustomerRow[] = [
  { id: "1", name: "Acme Corp", email: "ops@acme.co", plan: "Business", status: "active", mrr: "$1,200", joined: "Jan 12" },
  { id: "2", name: "Globex Inc", email: "dev@globex.io", plan: "Pro", status: "active", mrr: "$299", joined: "Feb 3" },
  { id: "3", name: "Initech", email: "admin@initech.com", plan: "Trial", status: "trial", mrr: "—", joined: "Apr 8" },
  { id: "4", name: "Umbrella LLC", email: "tech@umbrella.co", plan: "Business", status: "churned", mrr: "$0", joined: "Nov 21" },
  { id: "5", name: "Massive Dyn.", email: "team@massive.dev", plan: "Pro", status: "active", mrr: "$299", joined: "Mar 17" },
];

const statusBadgeVariant = {
  active: "success",
  trial: "warning",
  churned: "neutral",
} as const satisfies Record<CustomerRow["status"], "success" | "warning" | "neutral">;

const customerColumns: TableColumn<CustomerRow>[] = [
  {
    key: "name",
    header: "Customer",
    render: (row) => (
      <div className="flex items-center gap-2.5">
        <Avatar usuarioId="" name={row.name} size="sm" />
        <div>
          <div className="text-sm font-medium text-zinc-900">{row.name}</div>
          <div className="text-xs text-zinc-400">{row.email}</div>
        </div>
      </div>
    ),
  },
  {
    key: "plan",
    header: "Plan",
    render: (row) => <span className="text-zinc-600">{row.plan}</span>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={statusBadgeVariant[row.status]}>{row.status}</Badge>
    ),
  },
  {
    key: "mrr",
    header: "MRR",
    align: "right",
    render: (row) => (
      <span className="tabular-nums text-zinc-700">{row.mrr}</span>
    ),
  },
  {
    key: "joined",
    header: "Joined",
    align: "right",
    render: (row) => <span className="text-zinc-400">{row.joined}</span>,
  },
];

const activityItems: ActivityItem[] = [
  { id: "1", description: "Invoice #4821 paid · Acme Corp", timestamp: "2 min ago", tag: "billing", tagVariant: "success" },
  { id: "2", description: "New member invited · design@example.com", timestamp: "18 min ago", tag: "team", tagVariant: "neutral" },
  { id: "3", description: "Webhook delivery retried · payments", timestamp: "1 hr ago", tag: "webhook", tagVariant: "warning" },
  { id: "4", description: "Policy published · Data retention v3", timestamp: "3 hr ago", tag: "policy", tagVariant: "neutral" },
  { id: "5", description: "API key rotated · production", timestamp: "Yesterday", tag: "security", tagVariant: "danger" },
];

type QuotaItem = {
  label: string;
  sublabel: string;
  value: number;
  color: ProgressBarColor;
};

const quotas: QuotaItem[] = [
  { label: "API calls", sublabel: "84,200 / 100k", value: 84, color: "indigo" },
  { label: "Storage", sublabel: "18.4 GB / 50 GB", value: 37, color: "emerald" },
  { label: "Team seats", sublabel: "9 / 10 used", value: 90, color: "amber" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function Home() {
  const ctx = await requireAuth();

  return (
    <MainLayout
      currentUser={mainLayoutCurrentUser(ctx)}
      isSuperUsuario={isSuperUsuario(ctx)}
      roles={ctx.roles}
    >
      <div className="space-y-8">
        <SectionHeader
          title="Overview"
          description="High-signal metrics, customer activity, and resource usage."
        />

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <StatCard key={kpi.label} {...kpi} />
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[1fr_320px]">
          <Card flat>
            <CardHeader>
              <CardTitle>Customers</CardTitle>
              <Button variant="ghost" size="sm">
                Export
              </Button>
            </CardHeader>
            <DataTable
              columns={customerColumns}
              rows={customers}
              getRowKey={(row) => row.id}
              caption="Customer list"
            />
          </Card>

          <Card flat>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
              <Button variant="ghost" size="sm">
                View all
              </Button>
            </CardHeader>
            <ActivityFeed items={activityItems} />
          </Card>
        </section>

        <Card flat>
          <CardHeader>
            <CardTitle>Resource usage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {quotas.map((q) => (
              <ProgressBar
                key={q.label}
                label={q.label}
                sublabel={q.sublabel}
                value={q.value}
                color={q.color}
              />
            ))}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
