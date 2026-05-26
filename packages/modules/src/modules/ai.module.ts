import type { SyncoraModule } from "../types.js";

export const aiModule: SyncoraModule = {
  id: "ai",
  version: "1.0.0",
  displayName: "AI Operations",
  description: "AI router, vector retrieval, daily highlights generation",
  icon: "sparkles",
  navigation: [
    { label: "AI Assistant", href: "/ai", icon: "✦" }
  ],
  permissions: [
    {
      key: "ai:chat",
      description: "Use AI Assistant",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    }
  ],
  requiredPlan: "pro",
  aiCapabilities: [
    { id: "summarize-project", description: "Generate concise summaries of active projects" },
    { id: "draft-email", description: "Draft responsive emails to clients" },
    { id: "triage-inquiry", description: "Triage inbound customer requests and issues" }
  ]
};
