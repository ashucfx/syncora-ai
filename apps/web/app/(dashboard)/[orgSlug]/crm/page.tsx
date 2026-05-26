import type { Metadata } from "next";
import { db } from "@syncora/db";
import { redirect } from "next/navigation";
import { ClientListContainer } from "./client-list-container";

export const metadata: Metadata = { title: "Clients (CRM) - Syncora" };

interface CRMPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function CRMPage({ params }: CRMPageProps) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Clients (CRM)</h1>
        <p className="text-muted-foreground mt-1">
          Manage leads, clients, contacts, and business relationships for {org.name}.
        </p>
      </div>
      <ClientListContainer orgId={org.id} />
    </div>
  );
}
