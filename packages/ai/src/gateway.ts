import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { generateText, embed, type LanguageModel, type EmbeddingModel } from "ai";

// ─────────────────────────────────────────────
// Provider instances
// ─────────────────────────────────────────────

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─────────────────────────────────────────────
// Capability → Model routing table
// Route by cost, quality, and latency requirements
// ─────────────────────────────────────────────

export const CAPABILITY_ROUTES: Record<
  string,
  { model: LanguageModel; provider: string; modelId: string }
> = {
  "summarize-project": {
    model: openai("gpt-4o"),
    provider: "openai",
    modelId: "gpt-4o",
  },
  "draft-client-email": {
    model: openai("gpt-4o-mini"),
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
  "triage-inquiry": {
    model: anthropic("claude-3-haiku-20240307"),
    provider: "anthropic",
    modelId: "claude-3-haiku-20240307",
  },
  "generate-task-description": {
    model: openai("gpt-4o-mini"),
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
  "analyze-project-health": {
    model: openai("gpt-4o"),
    provider: "openai",
    modelId: "gpt-4o",
  },
  "extract-invoice-details": {
    model: openai("gpt-4o-mini"),
    provider: "openai",
    modelId: "gpt-4o-mini",
  },
};

const DEFAULT_ROUTE = CAPABILITY_ROUTES["draft-client-email"]!;

// ─────────────────────────────────────────────
// Embedding model (for RAG)
// ─────────────────────────────────────────────

export const embeddingModel: EmbeddingModel<string> = openai.embedding(
  "text-embedding-3-small"
);

// ─────────────────────────────────────────────
// AI Gateway — primary interface
// ─────────────────────────────────────────────

export interface GatewayRequest {
  capability: string;
  systemPrompt: string;
  userPrompt: string;
  context?: string; // RAG-injected context
  temperature?: number;
  maxTokens?: number;
}

export interface GatewayResponse {
  text: string;
  provider: string;
  modelId: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export async function gatewayComplete(
  request: GatewayRequest
): Promise<GatewayResponse> {
  const route = CAPABILITY_ROUTES[request.capability] ?? DEFAULT_ROUTE;
  const start = Date.now();

  const systemContent = request.context
    ? `${request.systemPrompt}\n\n## Relevant Context\n${request.context}`
    : request.systemPrompt;

  const result = await generateText({
    model: route.model,
    system: systemContent,
    prompt: request.userPrompt,
    temperature: request.temperature ?? 0.7,
    maxTokens: request.maxTokens ?? 2048,
  });

  return {
    text: result.text,
    provider: route.provider,
    modelId: route.modelId,
    usage: {
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    },
    latencyMs: Date.now() - start,
  };
}

// ─────────────────────────────────────────────
// Embedding helper
// ─────────────────────────────────────────────

export async function gatewayEmbed(text: string): Promise<number[]> {
  const result = await embed({
    model: embeddingModel,
    value: text,
  });
  return result.embedding;
}
