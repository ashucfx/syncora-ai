import type { Metadata } from "next";
import { db } from "@syncora/db";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PayButton } from "./pay-button";


export const metadata: Metadata = { title: "Client Dashboard - Syncora" };

interface ClientPageProps {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ success?: string; canceled?: string; invoiceId?: string }>;
}

export default async function ClientPortalPage({ params, searchParams }: ClientPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ orgSlug }, { success, canceled, invoiceId }] = await Promise.all([
    params,
    searchParams,
  ]);

  // Resolve the organization
  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  // Fetch client details
  const clientContact = await db.query.clients.findFirst({
    where: (c, { and, eq }) => and(eq(c.organizationId, org.id), eq(c.email, user.email!)),
  });

  if (!clientContact) redirect(`/dashboard/${orgSlug}`);

  // Fetch paid invoice details for success banner
  let paidInvoiceNumber: string | null = null;
  if (success === "true" && invoiceId) {
    const paidInvoice = await db.query.invoices.findFirst({
      where: (inv, { and, eq }) => and(eq(inv.id, invoiceId), eq(inv.clientId, clientContact.id)),
      columns: { number: true },
    });
    if (paidInvoice) {
      paidInvoiceNumber = paidInvoice.number;
    }
  }

  // Fetch client projects and invoices in parallel
  const [clientProjects, clientInvoices] = await Promise.all([
    db.query.projects.findMany({
      where: (p, { and, eq }) => and(eq(p.clientId, clientContact.id), eq(p.organizationId, org.id)),
      with: {
        milestones: true,
      },
    }),
    db.query.invoices.findMany({
      where: (inv, { and, eq }) => and(eq(inv.clientId, clientContact.id), eq(inv.organizationId, org.id)),
      orderBy: (inv, { desc }) => [desc(inv.dueDate)],
    }),
  ]);

  return (
    <div className="space-y-8">
      {success === "true" && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <span className="text-xl">✅</span>
          <div>
            <h3 className="font-bold text-sm">Payment Success!</h3>
            <p className="text-xs opacity-90 mt-0.5">
              {paidInvoiceNumber
                ? `Thank you! Your payment for Invoice ${paidInvoiceNumber} has been received.`
                : "Thank you! Your payment session has been processed successfully."}
            </p>
          </div>
        </div>
      )}

      {canceled === "true" && (
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-400 p-4 rounded-xl flex items-center gap-3 animate-fade-in shadow-sm">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="font-bold text-sm">Payment Canceled</h3>
            <p className="text-xs opacity-90 mt-0.5">
              The payment process was canceled. If you ran into issues, feel free to try again.
            </p>
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hello, {clientContact.name}!</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to your client portal for {org.name}. Here is the overview of your active projects and bills.
        </p>
      </div>

      {/* Projects Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Contracted Projects</h2>
        {clientProjects.length === 0 ? (
          <div className="bg-card border border-border p-8 rounded-xl text-center text-muted-foreground">
            No projects found under your account.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {clientProjects.map((project) => (
              <div key={project.id} className="bg-card border border-border rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-lg text-foreground">{project.name}</h3>
                    <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                      {project.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{project.description || "No description provided."}</p>
                </div>

                {project.milestones.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/60">
                    <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2">Project Milestones</h4>
                    <div className="space-y-2">
                      {project.milestones.slice(0, 3).map((m) => (
                        <div key={m.id} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">{m.title}</span>
                          <span className={m.isCompleted ? "text-emerald-500 font-bold" : "text-amber-500 font-medium"}>
                            {m.isCompleted ? "Completed" : "In Progress"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invoices Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold">Billing & Invoices</h2>
        {clientInvoices.length === 0 ? (
          <div className="bg-card border border-border p-8 rounded-xl text-center text-muted-foreground">
            No invoices billed to your account.
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-accent/20 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <th className="p-4">Invoice #</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Due Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-sm">
                  {clientInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-accent/5 transition-colors">
                      <td className="p-4 font-semibold text-foreground">{invoice.number}</td>
                      <td className="p-4 font-bold text-foreground">
                        {invoice.currency} {invoice.total}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${
                            invoice.status === "PAID"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : invoice.status === "SENT"
                              ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </td>
                      <td className="p-4 text-right">
                        {invoice.status !== "PAID" && (
                          <PayButton invoiceId={invoice.id} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
