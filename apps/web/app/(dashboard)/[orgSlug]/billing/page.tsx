import type { Metadata } from "next";
import { db } from "@syncora/db";
import { redirect } from "next/navigation";
import { InvoiceListContainer } from "./invoice-list-container";

export const metadata: Metadata = { title: "Invoices - Syncora" };

interface BillingPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function BillingPage({ params }: BillingPageProps) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  // Fetch client options for the add invoice dropdown
  const orgClients = await db.query.clients.findMany({
    where: (c, { eq }) => eq(c.organizationId, org.id),
    columns: { id: true, name: true, company: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
        <p className="text-muted-foreground mt-1">
          Track billing status, create manual invoices, and manage payment links for {org.name}.
        </p>
      </div>
      <InvoiceListContainer orgId={org.id} clients={orgClients} />
    </div>
  );
}
