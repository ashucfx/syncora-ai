"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { organizations, organizationUsers } from "@syncora/db";
import type { InferSelectModel } from "drizzle-orm";

type Org = Pick<InferSelectModel<typeof organizations>, "id" | "name" | "slug" | "logoUrl">;
type UserRole = InferSelectModel<typeof organizationUsers>["role"];

import type { NavItem } from "@syncora/modules";

interface DashboardShellProps {
  children: React.ReactNode;
  org: Org;
  userRole: UserRole;
  navigation: { moduleId: string; items: NavItem[] }[];
}

const CORE_ITEMS = [
  { label: "Dashboard", href: "", icon: "⬡" },
] as const;

const ADMIN_ITEMS = [
  { label: "Settings", href: "/settings", icon: "⚙️" },
] as const;

export function DashboardShell({ children, org, userRole, navigation }: DashboardShellProps) {
  const pathname = usePathname();
  const base = `/dashboard/${org.slug}`;

  const isActive = (href: string) => {
    const fullPath = `${base}${href}`;
    if (href === "") return pathname === base;
    return pathname.startsWith(fullPath);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="flex flex-col w-[var(--sidebar-width)] border-r border-border bg-card shrink-0">
        {/* Logo / Org */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
            {org.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{org.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole.toLowerCase()}</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {/* Core Items */}
          <ul className="space-y-1 mb-4">
            {CORE_ITEMS.map((item) => (
              <li key={item.label}>
                <Link
                  href={`${base}${item.href}`}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                    ${isActive(item.href)
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    }
                  `}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* Module Injected Navigation */}
          {navigation.map(({ moduleId, items }) => (
            <ul key={moduleId} className="space-y-1 mb-2 border-t border-border/50 pt-2">
              {items.map((item) => (
                <li key={item.label}>
                  <Link
                    href={`${base}${item.href}`}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                      ${isActive(item.href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }
                    `}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ))}

          {["OWNER", "ADMIN"].includes(userRole) && (
            <>
              <div className="mt-6 mb-2 px-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Admin
                </p>
              </div>
              <ul className="space-y-1">
                {ADMIN_ITEMS.map((item) => (
                  <li key={item.label}>
                    <Link
                      href={`${base}${item.href}`}
                      className={`
                        flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors
                        ${isActive(item.href)
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }
                      `}
                    >
                      <span className="text-base">{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <p className="text-xs text-muted-foreground text-center">Syncora by Ripple Nexus</p>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
