import type { SyncoraModule } from "../types.js";

export const projectsModule: SyncoraModule = {
  id: "projects",
  version: "1.0.0",
  displayName: "Project Management",
  description: "Collaborate on projects, manage tasks via Kanban, and track milestones",
  icon: "folder",
  navigation: [
    { label: "Projects", href: "/projects", icon: "📁" }
  ],
  permissions: [
    {
      key: "projects:read",
      description: "View projects and tasks",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER", "GUEST"]
    },
    {
      key: "projects:write",
      description: "Create and edit projects",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    },
    {
      key: "tasks:write",
      description: "Create and edit tasks",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    },
    {
      key: "milestones:write",
      description: "Manage milestones and project budgets",
      defaultRoles: ["OWNER", "ADMIN"]
    }
  ]
};
