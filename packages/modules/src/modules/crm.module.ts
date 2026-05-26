import type { SyncoraModule } from "../types.js";

export const crmModule: SyncoraModule = {
  id: "crm",
  version: "1.0.0",
  displayName: "Client Relations (CRM)",
  description: "Manage clients, leads, contact persons, and client interactions",
  icon: "users",
  navigation: [
    { label: "CRM", href: "/crm", icon: "👥" }
  ],
  permissions: [
    {
      key: "crm:read",
      description: "View clients and contacts",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER", "GUEST"]
    },
    {
      key: "crm:write",
      description: "Create and update clients/contacts",
      defaultRoles: ["OWNER", "ADMIN", "MEMBER"]
    },
    {
      key: "crm:delete",
      description: "Delete clients",
      defaultRoles: ["OWNER", "ADMIN"]
    }
  ],
  webhookEvents: ["client.created", "client.updated", "contact.created"]
};
