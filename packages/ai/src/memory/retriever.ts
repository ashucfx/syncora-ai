import { gatewayEmbed } from "../gateway.js";
import { db, aiMemory } from "@syncora/db";
import { eq, and, sql } from "drizzle-orm";

// ─────────────────────────────────────────────
// Store content in vector memory
// ─────────────────────────────────────────────

export async function embedAndStore(params: {
  organizationId: string;
  entityType: string;
  entityId: string;
  content: string;
}): Promise<void> {
  const embedding = await gatewayEmbed(params.content);

  await db
    .insert(aiMemory)
    .values({
      organizationId: params.organizationId,
      entityType: params.entityType,
      entityId: params.entityId,
      content: params.content,
      embedding,
      model: "text-embedding-3-small",
      tokenCount: Math.ceil(params.content.length / 4), // Rough estimate
    })
    .onConflictDoUpdate({
      target: [aiMemory.entityType, aiMemory.entityId],
      set: {
        content: params.content,
        embedding,
        updatedAt: new Date(),
      },
    });
}

// ─────────────────────────────────────────────
// Retrieve relevant context via cosine similarity
// ─────────────────────────────────────────────

export interface ContextChunk {
  content: string;
  entityType: string;
  entityId: string;
  similarity: number;
}

export async function retrieveContext(
  organizationId: string,
  query: string,
  topK = 5
): Promise<ContextChunk[]> {
  const embedding = await gatewayEmbed(query);
  const embeddingStr = `[${embedding.join(",")}]`;

  const results = await db.execute<{
    content: string;
    entity_type: string;
    entity_id: string;
    similarity: number;
  }>(
    sql`
      SELECT
        content,
        entity_type,
        entity_id,
        1 - (embedding <=> ${embeddingStr}::vector) AS similarity
      FROM ai_memory
      WHERE organization_id = ${organizationId}
        AND 1 - (embedding <=> ${embeddingStr}::vector) > 0.75
      ORDER BY embedding <=> ${embeddingStr}::vector
      LIMIT ${topK}
    `
  );

  return results.rows.map((r) => ({
    content: r.content,
    entityType: r.entity_type,
    entityId: r.entity_id,
    similarity: r.similarity,
  }));
}

// ─────────────────────────────────────────────
// Format context chunks as injection text
// ─────────────────────────────────────────────

export function formatContextForPrompt(chunks: ContextChunk[]): string {
  if (chunks.length === 0) return "";

  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (${c.entityType}) ${c.content.slice(0, 500)}${c.content.length > 500 ? "..." : ""}`
    )
    .join("\n\n");
}
