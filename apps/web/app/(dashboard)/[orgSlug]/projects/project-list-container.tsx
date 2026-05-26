"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

interface ProjectListContainerProps {
  orgId: string;
  clients: { id: string; name: string; company: string | null }[];
}

export function ProjectListContainer({ orgId, clients }: ProjectListContainerProps) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("PLANNING");
  const [priority, setPriority] = useState("MEDIUM");
  const [budget, setBudget] = useState("");

  const utils = api.useUtils();

  const { data: projects, isLoading } = api.projects.listProjects.useQuery({
    orgId,
    status: statusFilter === "ALL" ? undefined : (statusFilter as any),
  });

  const createMutation = api.projects.createProject.useMutation({
    onSuccess: () => {
      utils.projects.listProjects.invalidate();
      setIsModalOpen(false);
      resetForm();
    },
  });

  const resetForm = () => {
    setName("");
    setDescription("");
    setClientId("");
    setStatus("PLANNING");
    setPriority("MEDIUM");
    setBudget("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      orgId,
      name,
      description: description || undefined,
      clientId: clientId || undefined,
      status: status as any,
      priority: priority as any,
      budget: budget || undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-card p-4 rounded-xl border border-border">
        <div className="flex flex-1 items-center">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="PLANNING">Planning</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-2"
        >
          <span>+</span> Create Project
        </button>
      </div>

      {/* Projects Display */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20 text-muted-foreground">
          <span className="animate-spin mr-2">⬡</span> Loading projects...
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          No projects found. Create one to get started!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-card border border-border hover:border-primary/20 rounded-xl overflow-hidden flex flex-col justify-between shadow-sm hover:shadow-md transition-all"
            >
              <div className="p-6">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-bold text-lg text-foreground truncate">{project.name}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      project.status === "ACTIVE"
                        ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                        : project.status === "PLANNING"
                        ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                        : project.status === "ON_HOLD"
                        ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {project.status.replace("_", " ")}
                  </span>
                </div>

                {project.client && (
                  <p className="text-xs font-semibold text-primary mt-1">
                    🏢 {project.client.company || project.client.name}
                  </p>
                )}

                <p className="text-sm text-muted-foreground mt-3 line-clamp-3">
                  {project.description || "No description provided."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    project.priority === "CRITICAL"
                      ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      : project.priority === "HIGH"
                      ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300"
                      : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                  }`}>
                    {project.priority} Priority
                  </span>
                  {project.budget && (
                    <span className="bg-accent/40 px-2 py-0.5 rounded-full text-xs font-semibold text-accent-foreground">
                      💰 {project.currency} {project.budget}
                    </span>
                  )}
                </div>
              </div>

              <div className="px-6 py-4 bg-accent/10 border-t border-border/50 flex justify-between items-center text-xs text-muted-foreground">
                <span>Start: {project.startDate ? new Date(project.startDate).toLocaleDateString() : "TBD"}</span>
                <span>End: {project.endDate ? new Date(project.endDate).toLocaleDateString() : "TBD"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-lg rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-accent/20">
              <h2 className="text-xl font-bold">Create New Project</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="">No Client (Internal)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company ? `${c.company} (${c.name})` : c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Budget</label>
                  <input
                    type="number"
                    placeholder="USD"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-border flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-accent/40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
