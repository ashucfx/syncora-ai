import type { SyncoraModule } from "./types.js";

// ─────────────────────────────────────────────
// Module Registry
// Central manifest of all active platform modules
// ─────────────────────────────────────────────

class ModuleRegistry {
  private modules = new Map<string, SyncoraModule>();

  register(module: SyncoraModule): void {
    if (this.modules.has(module.id)) {
      throw new Error(`Module "${module.id}" is already registered`);
    }
    this.modules.set(module.id, module);
  }

  get(id: string): SyncoraModule | undefined {
    return this.modules.get(id);
  }

  getAll(): SyncoraModule[] {
    return Array.from(this.modules.values());
  }

  /** Aggregate all nav items from registered modules — drives the sidebar */
  getNavigation(userPlan: string, enabledFlags: string[]): { moduleId: string; items: SyncoraModule["navigation"] }[] {
    return this.getAll()
      .filter((mod) => {
        if (mod.featureFlag && !enabledFlags.includes(mod.featureFlag)) {
          return false;
        }
        if (mod.requiredPlan) {
          const tierOrder = ["free", "pro", "enterprise"];
          const required = tierOrder.indexOf(mod.requiredPlan);
          const current = tierOrder.indexOf(userPlan);
          if (current < required) return false;
        }
        return true;
      })
      .map((mod) => ({ moduleId: mod.id, items: mod.navigation }));
  }

  /** Aggregate all permissions from registered modules */
  getAllPermissions(): SyncoraModule["permissions"] {
    return this.getAll().flatMap((mod) => mod.permissions);
  }

  /** All webhook event types that any module can emit */
  getAllWebhookEvents(): string[] {
    return this.getAll().flatMap((mod) => mod.webhookEvents ?? []);
  }
}

import { crmModule } from "./modules/crm.module.js";
import { projectsModule } from "./modules/projects.module.js";
import { billingModule } from "./modules/billing.module.js";
import { aiModule } from "./modules/ai.module.js";
import { teamModule } from "./modules/team.module.js";
import { automationModule } from "./modules/automation.module.js";
import { reportsModule } from "./modules/reports.module.js";

export const moduleRegistry = new ModuleRegistry();

// Register core modules
moduleRegistry.register(crmModule);
moduleRegistry.register(projectsModule);
moduleRegistry.register(billingModule);
moduleRegistry.register(aiModule);
moduleRegistry.register(teamModule);
moduleRegistry.register(automationModule);
moduleRegistry.register(reportsModule);
