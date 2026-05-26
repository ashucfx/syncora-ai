import "dotenv/config";
import { Worker } from "bullmq";
import { redisConnectionOptions, QUEUE_NAMES } from "@syncora/queue";

console.log("🚀 Starting Syncora Background Workers...");

// ─────────────────────────────────────────────
// 1. Invoicing Workers
// ─────────────────────────────────────────────
const invoiceWorker = new Worker(
  QUEUE_NAMES.INVOICE_JOBS,
  async (job) => {
    console.log(`[Invoice Job] Processing: ${job.name} (ID: ${job.id})`);
    
    if (job.name === "send-invoice") {
      const { invoiceId, clientEmail } = job.data as { invoiceId: string; clientEmail: string };
      console.log(`[Invoice Job] Sending invoice ${invoiceId} to ${clientEmail}...`);
      
      // Simulate PDF generation and email sending
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      console.log(`[Invoice Job] Invoice ${invoiceId} sent successfully!`);
      return { success: true, invoiceId };
    }
    
    return { status: "ignored" };
  },
  { connection: redisConnectionOptions, concurrency: 5 }
);

// ─────────────────────────────────────────────
// 2. AI Operation Workers
// ─────────────────────────────────────────────
const aiWorker = new Worker(
  QUEUE_NAMES.AI_JOBS,
  async (job) => {
    console.log(`[AI Job] Processing: ${job.name} (ID: ${job.id})`);
    
    if (job.name === "summarize-project") {
      const { projectId } = job.data as { projectId: string };
      console.log(`[AI Job] Summarizing project ${projectId}...`);
      
      // Mock AI processing time
      await new Promise((resolve) => setTimeout(resolve, 3000));
      
      console.log(`[AI Job] Project ${projectId} summarized successfully.`);
      return { summary: "This is a summarized project description." };
    }
    
    return { status: "ignored" };
  },
  { connection: redisConnectionOptions, concurrency: 2 }
);

// ─────────────────────────────────────────────
// 3. Notifications Workers
// ─────────────────────────────────────────────
const notificationsWorker = new Worker(
  QUEUE_NAMES.NOTIFICATIONS,
  async (job) => {
    console.log(`[Notification Job] Processing: ${job.name} (ID: ${job.id})`);
    // Mock notification dispatching
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { sent: true };
  },
  { connection: redisConnectionOptions, concurrency: 10 }
);

// Error handlers
invoiceWorker.on("failed", (job, err) => {
  console.error(`❌ Invoice job ${job?.id} failed:`, err);
});

aiWorker.on("failed", (job, err) => {
  console.error(`❌ AI job ${job?.id} failed:`, err);
});

notificationsWorker.on("failed", (job, err) => {
  console.error(`❌ Notification job ${job?.id} failed:`, err);
});

console.log("✅ All background workers are listening for jobs!");

// Handle graceful shutdown
const gracefulShutdown = async () => {
  console.log("\nStopping workers...");
  await Promise.all([
    invoiceWorker.close(),
    aiWorker.close(),
    notificationsWorker.close(),
  ]);
  console.log("Workers stopped gracefully. Exiting.");
  process.exit(0);
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);
