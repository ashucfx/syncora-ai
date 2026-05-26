import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
  customType,
  integer,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────
// pgvector custom type for Drizzle
// ─────────────────────────────────────────────

const vector = customType<{ data: number[]; driverData: string }>({
  dataType(config) {
    return `vector(${(config as { dimensions?: number } | undefined)?.dimensions ?? 1536})`;
  },
  toDriver(value: number[]): string {
    return `[${value.join(",")}]`;
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(",")
      .map((v) => parseFloat(v));
  },
});

// ─────────────────────────────────────────────
// AI Memory (RAG: Retrieval-Augmented Generation)
// Stores embedded content for semantic retrieval
// ─────────────────────────────────────────────

export const aiMemory = pgTable(
  "ai_memory",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    entityType: text("entity_type").notNull(), // 'project' | 'client' | 'task' | 'note'
    entityId: uuid("entity_id").notNull(),
    content: text("content").notNull(), // The raw text that was embedded
    embedding: vector("embedding", { dimensions: 1536 }), // OpenAI text-embedding-3-small
    model: text("model").notNull().default("text-embedding-3-small"),
    tokenCount: integer("token_count"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_ai_memory_org").on(t.organizationId),
    entityIndex: index("idx_ai_memory_entity").on(t.entityType, t.entityId),
    // Note: HNSW vector index created via raw SQL in migration
    // CREATE INDEX idx_ai_memory_embedding ON ai_memory USING hnsw (embedding vector_cosine_ops);
  })
);

// ─────────────────────────────────────────────
// AI Requests Log
// Track all AI API calls for cost analysis and debugging
// ─────────────────────────────────────────────

export const aiRequests = pgTable(
  "ai_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull(),
    userId: uuid("user_id"),
    capability: text("capability").notNull(), // 'summarize-project' | 'draft-email'
    provider: text("provider").notNull(), // 'openai' | 'anthropic'
    model: text("model").notNull(),
    promptTokens: integer("prompt_tokens"),
    completionTokens: integer("completion_tokens"),
    totalTokens: integer("total_tokens"),
    latencyMs: integer("latency_ms"),
    success: text("success").notNull().default("true"),
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    orgIndex: index("idx_ai_requests_org").on(t.organizationId),
    capabilityIndex: index("idx_ai_requests_capability").on(t.capability),
    createdIndex: index("idx_ai_requests_created").on(t.createdAt),
  })
);
