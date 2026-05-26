"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/trpc/client";

export default function OrgSetupPage() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("");
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  // Auto-generate URL slug from organization name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "") // Remove non-alphanumeric characters
      .replace(/[\s_-]+/g, "-")  // Replace spaces and underscores with hyphens
      .replace(/^-+|-+$/g, "");   // Remove leading/trailing hyphens
    setSlug(generatedSlug);
  }, [name]);

  const createMutation = api.organization.create.useMutation({
    onSuccess: (org) => {
      // Redirect directly to the new organization dashboard
      router.push(`/dashboard/${org.slug}`);
    },
    onError: (err) => {
      setError(err.message || "Failed to create organization");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name || !slug) return;

    createMutation.mutate({
      name,
      slug,
      industry: industry || undefined,
    });
  };

  return (
    <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
          Set up your workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Create an organization to start collaborating.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 p-3 rounded-lg text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Organization Name
          </label>
          <input
            type="text"
            required
            placeholder="Acme Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Workspace URL Slug
          </label>
          <div className="flex rounded-lg shadow-sm">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border bg-accent/20 text-muted-foreground text-xs">
              syncora.app/
            </span>
            <input
              type="text"
              required
              placeholder="acme-corp"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full bg-background border border-border rounded-r-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Only lowercase letters, numbers, and hyphens are allowed.
          </p>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            Industry (Optional)
          </label>
          <input
            type="text"
            placeholder="Software, Real Estate, Consulting..."
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>

        <button
          type="submit"
          disabled={createMutation.isPending}
          className="w-full bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-lg text-sm transition-all disabled:opacity-50"
        >
          {createMutation.isPending ? "Creating Workspace..." : "Create Workspace"}
        </button>
      </form>
    </div>
  );
}
