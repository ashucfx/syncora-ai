import type { SyncoraModule } from "../types.js";

export const reportsModule: SyncoraModule = {
  id: "reports",
  version: "1.0.0",
  displayName: "Reporting & Analytics",
  description: "Get insight into active clients, invoice values, project delays, and performance",
  icon: "bar-chart",
  navigation: [
    { label: "Reports", href: "/reports", icon: "📊" }
  ],
  permissions: [
    {
      key: "reports:read",
      description: "View operational reports",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    }
  ]
};
