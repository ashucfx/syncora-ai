import { createTRPCRouter } from "./trpc.js";
import { crmRouter } from "./routers/crm.router.js";
import { projectsRouter } from "./routers/projects.router.js";
import { billingRouter } from "./routers/billing.router.js";
import { teamRouter } from "./routers/team.router.js";
import { organizationRouter } from "./routers/organization.router.js";

/**
 * Root tRPC router — all domain routers merge here.
 * Access via: api.crm.*, api.projects.*, api.billing.*, api.team.*, api.organization.*
 */
export const appRouter = createTRPCRouter({
  crm: crmRouter,
  projects: projectsRouter,
  billing: billingRouter,
  team: teamRouter,
  organization: organizationRouter,
});

export type AppRouter = typeof appRouter;
