"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

interface InvoiceListContainerProps {
  orgId: string;
  clients: { id: string; name: string; company: string | null }[];
}

export function InvoiceListContainer({ orgId, clients }: InvoiceListContainerProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDateString, setDueDateString] = useState("");
  const [notes, setNotes] = useState("");

  const utils = api.useUtils();

  const { data: invoices, isLoading } = api.billing.listInvoices.useQuery({
    orgId,
    status: statusFilter === "ALL" ? undefined : (statusFilter as any),
  });

  const createMutation = api.billing.createInvoice.useMutation({
    onSuccess: () => {
      utils.billing.listInvoices.invalidate();
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setClientId("");
    setAmount("");
    setDueDateString("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amount || !dueDateString) return;

    createMutation.mutate({
      orgId,
      clientId,
      subtotal: amount,
      taxAmount: "0",
      total: amount,
      dueDate: new Date(dueDateString),
      notes: notes || undefined,
      lineItems: [
        {
          description: "General Consulting & Support Services",
          quantity: "1",
          unitPrice: amount,
          amount: amount,
        },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-1 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="SENT">Sent</option>
            <option value="VIEWED">Viewed</option>
            <option value="PAID">Paid</option>
            <option value="OVERDUE">Overdue</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-2"
        >
          <span>+</span> Create Invoice
        </button>
      </div>

      {/* Invoices Display */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground">
          <span className="animate-spin mr-2">⬡</span> Loading invoices...
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          No invoices found. Create one to get started!
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-accent/20 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="p-4">Invoice #</th>
                  <th className="p-4">Client</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-accent/5 transition-colors">
                    <td className="p-4 font-semibold text-foreground">{invoice.number}</td>
                    <td className="p-4 text-muted-foreground">
                      {invoice.client ? (
                        <div>
                          <p className="font-semibold text-foreground">{invoice.client.name}</p>
                          {invoice.client.company && <p className="text-xs">{invoice.client.company}</p>}
                        </div>
                      ) : (
                        "Unknown Client"
                      )}
                    </td>
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
                            : invoice.status === "OVERDUE"
                            ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(invoice.dueDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-accent/20">
              <h2 className="text-xl font-bold">Create New Invoice</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium mb-1">Client *</label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">Select a Client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Total Amount (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={dueDateString}
                    onChange={(e) => setDueDateString(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Terms, bank account info, or message to client..."
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Invoice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
