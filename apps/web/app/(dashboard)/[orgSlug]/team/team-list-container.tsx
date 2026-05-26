"use client";

import { useState } from "react";
import { api } from "@/lib/trpc/client";

interface TeamListContainerProps {
  orgId: string;
}

export function TeamListContainer({ orgId }: TeamListContainerProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");

  const utils = api.useUtils();

  const { data: members, isLoading: loadingMembers } = api.team.listMembers.useQuery({
    orgId,
  });

  const { data: invitations, isLoading: loadingInvitations } = api.team.listInvitations.useQuery({
    orgId,
  });

  const inviteMutation = api.team.inviteMember.useMutation({
    onSuccess: () => {
      utils.team.listInvitations.invalidate();
      setIsModalOpen(false);
      setEmail("");
      setRole("MEMBER");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    inviteMutation.mutate({
      orgId,
      email,
      role: role as any,
    });
  };

  return (
    <div className="space-y-8">
      {/* Search & Actions Bar */}
      <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
        <h2 className="text-lg font-bold text-foreground">Active Collaborators</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 transition-all flex items-center justify-center gap-2"
        >
          <span>+</span> Invite Member
        </button>
      </div>

      {/* Members Display */}
      {loadingMembers ? (
        <div className="flex justify-center items-center py-10 text-muted-foreground">
          <span className="animate-spin mr-2">⬡</span> Loading team members...
        </div>
      ) : !members || members.length === 0 ? (
        <div className="bg-card rounded-xl border border-border p-12 text-center text-muted-foreground">
          No members found.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-card border border-border rounded-xl p-5 shadow-sm flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                  {member.user ? (member.user.firstName ? member.user.firstName.charAt(0) : member.user.email.charAt(0)).toUpperCase() : "U"}
                </div>
                <div>
                  <p className="font-semibold text-foreground">
                    {member.user ? `${member.user.firstName} ${member.user.lastName}` : "Pending User"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.user ? member.user.email : ""}
                  </p>
                </div>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                  member.role === "OWNER"
                    ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                    : member.role === "ADMIN"
                    ? "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                }`}
              >
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pending Invitations Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-foreground">Pending Invitations</h2>
        {loadingInvitations ? (
          <div className="text-muted-foreground text-sm">Loading invitations...</div>
        ) : !invitations || invitations.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No pending invitations.</p>
        ) : (
          <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm text-foreground">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as <span className="font-medium text-foreground">{inv.role}</span> · Expires: {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  PENDING
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Invite Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-xl border border-border shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-border flex justify-between items-center bg-accent/20">
              <h2 className="text-xl font-bold">Invite New Member</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground text-lg">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="collaborator@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none"
                >
                  <option value="MEMBER">Member (Read & Write)</option>
                  <option value="ADMIN">Admin (Full Control)</option>
                  <option value="GUEST">Guest (Read Only)</option>
                </select>
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
                  disabled={inviteMutation.isPending}
                  className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm hover:bg-primary/95 disabled:opacity-50"
                >
                  {inviteMutation.isPending ? "Inviting..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
