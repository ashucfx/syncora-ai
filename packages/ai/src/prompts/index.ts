import { z } from "zod";

// ─────────────────────────────────────────────
// Prompt: Summarize Project
// ─────────────────────────────────────────────

export const summarizeProjectPrompt = {
  capability: "summarize-project",
  system: `You are an expert project manager and technical writer for Syncora, an operations platform.
Your job is to generate a clear, concise executive summary of a project based on its data.
Focus on: current status, key accomplishments, blockers, upcoming milestones, and overall health.
Write in a professional but direct tone. Use bullet points sparingly. Be factual.
Output format: plain text paragraphs (2-4 paragraphs max).`,

  buildUserPrompt: (params: {
    projectName: string;
    status: string;
    description: string;
    completedTasks: number;
    totalTasks: number;
    upcomingMilestones: string[];
    overdueTasks: number;
    teamSize: number;
    clientName?: string;
  }) => `
Project: ${params.projectName}
Status: ${params.status}
Client: ${params.clientName ?? "Internal"}
Description: ${params.description}
Tasks: ${params.completedTasks}/${params.totalTasks} completed (${params.overdueTasks} overdue)
Team Size: ${params.teamSize}
Upcoming Milestones: ${params.upcomingMilestones.join(", ") || "None"}

Generate an executive summary for this project.`,

  inputSchema: z.object({
    projectName: z.string(),
    status: z.string(),
    description: z.string().optional().default(""),
    completedTasks: z.number(),
    totalTasks: z.number(),
    upcomingMilestones: z.array(z.string()),
    overdueTasks: z.number(),
    teamSize: z.number(),
    clientName: z.string().optional(),
  }),
} as const;

// ─────────────────────────────────────────────
// Prompt: Draft Client Email
// ─────────────────────────────────────────────

export const draftClientEmailPrompt = {
  capability: "draft-client-email",
  system: `You are a professional client communication specialist for a service business.
Draft clear, professional emails on behalf of the user.
Rules:
- Be warm but professional
- Be concise — no filler phrases like "I hope this email finds you well"
- Always end with a clear call to action
- Do NOT include subject line unless requested
- Output only the email body`,

  buildUserPrompt: (params: {
    context: string;
    clientName: string;
    senderName: string;
    purpose: "FOLLOW_UP" | "INVOICE_REMINDER" | "PROJECT_UPDATE" | "WELCOME" | "GENERAL";
    additionalInstructions?: string;
  }) => `
Draft an email to ${params.clientName} from ${params.senderName}.
Purpose: ${params.purpose}
Context: ${params.context}
${params.additionalInstructions ? `Additional instructions: ${params.additionalInstructions}` : ""}`,

  inputSchema: z.object({
    context: z.string(),
    clientName: z.string(),
    senderName: z.string(),
    purpose: z.enum(["FOLLOW_UP", "INVOICE_REMINDER", "PROJECT_UPDATE", "WELCOME", "GENERAL"]),
    additionalInstructions: z.string().optional(),
  }),
} as const;

// ─────────────────────────────────────────────
// Prompt: Triage Inquiry
// ─────────────────────────────────────────────

export const triageInquiryPrompt = {
  capability: "triage-inquiry",
  system: `You are an intelligent triage assistant for a service business CRM.
Analyze incoming client communications and classify them.
Output ONLY valid JSON with no extra text.`,

  buildUserPrompt: (params: { emailBody: string; senderEmail: string }) => `
Analyze this incoming message and return JSON:

From: ${params.senderEmail}
Message: ${params.emailBody}

Return JSON:
{
  "category": "SUPPORT" | "BILLING" | "LEAD" | "PROJECT_UPDATE" | "COMPLAINT" | "GENERAL",
  "sentiment": "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "summary": "one sentence summary",
  "suggestedAction": "one sentence recommended next step"
}`,

  inputSchema: z.object({
    emailBody: z.string(),
    senderEmail: z.string().email(),
  }),

  outputSchema: z.object({
    category: z.enum(["SUPPORT", "BILLING", "LEAD", "PROJECT_UPDATE", "COMPLAINT", "GENERAL"]),
    sentiment: z.enum(["POSITIVE", "NEUTRAL", "NEGATIVE", "URGENT"]),
    priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
    summary: z.string(),
    suggestedAction: z.string(),
  }),
} as const;

// ─────────────────────────────────────────────
// Prompt: Generate Task Description
// ─────────────────────────────────────────────

export const generateTaskDescriptionPrompt = {
  capability: "generate-task-description",
  system: `You are a senior software project manager.
Generate a clear, actionable task description with acceptance criteria.
Format:
## Overview
[1-2 sentences]

## Acceptance Criteria
- [ ] criterion 1
- [ ] criterion 2

Keep it concise and developer-friendly.`,

  buildUserPrompt: (params: {
    taskTitle: string;
    projectContext?: string;
  }) => `
Task: ${params.taskTitle}
Project Context: ${params.projectContext ?? "Not provided"}

Generate a task description with acceptance criteria.`,

  inputSchema: z.object({
    taskTitle: z.string(),
    projectContext: z.string().optional(),
  }),
} as const;
