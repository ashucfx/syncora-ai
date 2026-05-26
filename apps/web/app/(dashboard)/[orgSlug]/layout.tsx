import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@syncora/db";
import { moduleRegistry } from "@syncora/modules";
import { TRPCReactProvider } from "@/lib/trpc/provider";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { orgSlug } = await params;

  // Resolve org and verify membership (server-side guard)
  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
  });

  if (!org) redirect("/dashboard");

  const membership = await db.query.organizationUsers.findFirst({
    where: (ou, { and, eq }) =>
      and(eq(ou.userId, user.id), eq(ou.organizationId, org.id)),
    columns: { role: true },
  });

  if (!membership) redirect("/dashboard");

  // Get dynamic navigation items based on the org plan tier and active feature flags
  const navigation = moduleRegistry.getNavigation(org.planId, []);

  return (
    <TRPCReactProvider orgSlug={orgSlug}>
      <DashboardShell org={org} userRole={membership.role} navigation={navigation}>
        {children}
      </DashboardShell>
    </TRPCReactProvider>
  );
}
