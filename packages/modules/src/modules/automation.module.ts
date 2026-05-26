import type { SyncoraModule } from "../types.js";

export const automationModule: SyncoraModule = {
  id: "automation",
  version: "1.0.0",
  displayName: "Workflow Automation",
  description: "Automate operations with n8n, webhooks, and cron triggers",
  icon: "zap",
  navigation: [
    { label: "Automation", href: "/automation", icon: "⚡" }
  ],
  permissions: [
    {
      key: "automation:read",
      description: "View automation logs and active workflows",
      defaultRoles: ["OWNER", "ADMIN"]
    },
    {
      key: "automation:write",
      description: "Manage workflows",
      defaultRoles: ["OWNER", "ADMIN"]
    }
  ]
};
