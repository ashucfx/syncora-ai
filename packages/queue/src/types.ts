// ─────────────────────────────────────────────
// Job payload types — typed per queue
// ─────────────────────────────────────────────

export type NotificationJobData = {
  type: "IN_APP" | "EMAIL" | "BOTH";
  organizationId: string;
  userId: string;
  notification: {
    type: string;
    title: string;
    body?: string;
    entityType?: string;
    entityId?: string;
    href?: string;
  };
};

export type AiJobData =
  | {
      capability: "summarize-project";
      organizationId: string;
      projectId: string;
      requestedByUserId: string;
    }
  | {
      capability: "embed-content";
      organizationId: string;
      entityType: string;
      entityId: string;
      content: string;
    }
  | {
      capability: "draft-client-email";
      organizationId: string;
      clientId: string;
      context: string;
      requestedByUserId: string;
    };

export type InvoiceJobData =
  | {
      type: "GENERATE_PDF";
      invoiceId: string;
      organizationId: string;
    }
  | {
      type: "SEND_INVOICE";
      invoiceId: string;
      organizationId: string;
      clientEmail: string;
    }
  | {
      type: "CHECK_OVERDUE";
      organizationId: string;
    };

export type WebhookRelayJobData = {
  provider: "STRIPE" | "RAZORPAY" | "PAYPAL";
  eventId: string;
  eventType: string;
  payload: unknown;
  signature: string;
};

export type EmailDeliveryJobData = {
  to: string;
  from?: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string; // base64
    contentType: string;
  }>;
  metadata?: Record<string, string>;
};

export type ExportJobData = {
  type: "EXPORT_INVOICES" | "EXPORT_CLIENTS" | "EXPORT_PROJECTS";
  organizationId: string;
  requestedByUserId: string;
  filters?: Record<string, unknown>;
  format: "CSV" | "XLSX" | "PDF";
};
