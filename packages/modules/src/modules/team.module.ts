import type { SyncoraModule } from "../types.js";

export const teamModule: SyncoraModule = {
  id: "team",
  version: "1.0.0",
  displayName: "Team Management",
  description: "Manage team members, roles, permissions, and invitations",
  icon: "shield",
  navigation: [
    { label: "Team", href: "/team", icon: "🏢" }
  ],
  permissions: [
    {
      key: "team:read",
      description: "View team members",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    },
    {
      key: "team:write",
      description: "Invite or update team members",
      defaultRoles: ["OWNER", "ADMIN"]
    }
  ]
};
