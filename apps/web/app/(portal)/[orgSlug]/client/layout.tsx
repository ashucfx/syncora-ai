import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { db } from "@syncora/db";

export default async function ClientPortalLayout({
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

  // Resolve the organization
  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  // Verify that the user is registered as a client contact in the CRM schema
  const clientContact = await db.query.clients.findFirst({
    where: (c, { and, eq }) => and(eq(c.organizationId, org.id), eq(c.email, user.email!)),
  });

  if (!clientContact) {
    // If not a client contact, redirect back to primary dashboard
    redirect(`/dashboard/${orgSlug}`);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Client Header */}
      <header className="border-b border-border bg-card px-6 py-4 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="font-semibold text-foreground">{org.name}</span>
            <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 rounded-full bg-accent/40 font-medium">
              Client Portal
            </span>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          Logged in as: <span className="font-semibold text-foreground">{user.email}</span>
        </div>
      </header>

      {/* Main Layout Content */}
      <main className="flex-1 p-8 max-w-6xl mx-auto w-full space-y-6">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        Powered by Syncora Client Hub
      </footer>
    </div>
  );
}
