import type { Metadata } from "next";
import { db } from "@syncora/db";
import { projects, clients, invoices, tasks } from "@syncora/db";
import { eq, and, count, sql } from "drizzle-orm";

export const metadata: Metadata = { title: "Dashboard" };

interface DashboardPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) return null;

  // Fetch dashboard metrics in parallel
  const [
    activeProjectsCount,
    activeClientsCount,
    pendingInvoicesCount,
    overdueTasks,
  ] = await Promise.all([
    db
      .select({ count: count() })
      .from(projects)
      .where(and(eq(projects.organizationId, org.id), eq(projects.status, "ACTIVE")))
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(clients)
      .where(and(eq(clients.organizationId, org.id), eq(clients.status, "ACTIVE")))
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, org.id),
          sql`status IN ('SENT', 'OVERDUE')`
        )
      )
      .then((r) => r[0]?.count ?? 0),

    db
      .select({ count: count() })
      .from(tasks)
      .where(
        and(
          sql`project_id IN (SELECT id FROM projects WHERE organization_id = ${org.id})`,
          sql`due_date < NOW()`,
          sql`status NOT IN ('DONE', 'CANCELLED')`
        )
      )
      .then((r) => r[0]?.count ?? 0),
  ]);

  const stats = [
    {
      label: "Active Projects",
      value: activeProjectsCount,
      icon: "📁",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
    },
    {
      label: "Active Clients",
      value: activeClientsCount,
      icon: "👥",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
    },
    {
      label: "Pending Invoices",
      value: pendingInvoicesCount,
      icon: "📄",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks,
      icon: "⚠️",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back to {org.name}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening across your operations today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card p-6 flex items-center gap-4 shadow-sm"
          >
            <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center text-2xl`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.color}`}>{String(stat.value)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
