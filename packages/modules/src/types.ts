// ─────────────────────────────────────────────
// Syncora Module System Types
// Every feature module implements this interface
// ─────────────────────────────────────────────

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  badge?: string;
}

export interface ModulePermission {
  key: string;         // e.g., 'billing:write'
  description: string;
  defaultRoles: string[];
}

export interface WorkerDefinition {
  queue: string;
  concurrency?: number;
}

export interface AICapability {
  id: string;
  description: string;
  inputSchema?: Record<string, unknown>;
}

export type PlanTier = "free" | "pro" | "enterprise";

export interface SyncoraModule {
  /** Unique identifier for this module */
  id: string;
  /** Semver */
  version: string;
  displayName: string;
  description: string;
  icon: string;

  /** Navigation items injected into the sidebar */
  navigation: NavItem[];

  /** Permissions this module introduces to the RBAC system */
  permissions: ModulePermission[];

  /** Feature flag key — entire module is gated if flag is disabled */
  featureFlag?: string;

  /** Minimum subscription plan required to access this module */
  requiredPlan?: PlanTier;

  /** BullMQ workers registered by this module */
  workers?: WorkerDefinition[];

  /** Domain events emitted to n8n or other consumers */
  webhookEvents?: string[];

  /** AI capabilities contributed by this module */
  aiCapabilities?: AICapability[];
}

export interface ModuleRegistryState {
  modules: Map<string, SyncoraModule>;
}
