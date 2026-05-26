import { Queue } from "bullmq";
import { redisConnectionOptions } from "./redis.js";

// ─────────────────────────────────────────────
// Queue names — typed constants
// ─────────────────────────────────────────────

export const QUEUE_NAMES = {
  NOTIFICATIONS:  "q-notifications",
  AI_JOBS:        "q-ai_jobs",
  INVOICE_JOBS:   "q-invoice_jobs",
  WEBHOOK_RELAY:  "q-webhook_relay",
  EXPORTS:        "q-exports",
  REALTIME_SYNC:  "q-realtime_sync",
  EMAIL_DELIVERY: "q-email_delivery",
} as const;

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ─────────────────────────────────────────────
// Queue instances — BullMQ manages Redis internally
// ─────────────────────────────────────────────

const defaultJobOptions = {
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 500 },
};

export const notificationsQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
  connection: redisConnectionOptions,
  defaultJobOptions: { ...defaultJobOptions, attempts: 3, backoff: { type: "exponential", delay: 2000 } },
});

export const aiJobsQueue = new Queue(QUEUE_NAMES.AI_JOBS, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
  },
});

export const invoiceJobsQueue = new Queue(QUEUE_NAMES.INVOICE_JOBS, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: "exponential", delay: 3000 },
    priority: 1,
  },
});

export const webhookRelayQueue = new Queue(QUEUE_NAMES.WEBHOOK_RELAY, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 10,
    backoff: { type: "exponential", delay: 1000 },
    priority: 1,
  },
});

export const exportsQueue = new Queue(QUEUE_NAMES.EXPORTS, {
  connection: redisConnectionOptions,
  defaultJobOptions: { ...defaultJobOptions, attempts: 2, backoff: { type: "fixed", delay: 10000 } },
});

export const emailDeliveryQueue = new Queue(QUEUE_NAMES.EMAIL_DELIVERY, {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    ...defaultJobOptions,
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
  },
});
