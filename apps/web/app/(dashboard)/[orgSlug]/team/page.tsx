import type { Metadata } from "next";
import { db } from "@syncora/db";
import { redirect } from "next/navigation";
import { TeamListContainer } from "./team-list-container";

export const metadata: Metadata = { title: "Team - Syncora" };

interface TeamPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function TeamPage({ params }: TeamPageProps) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
        <p className="text-muted-foreground mt-1">
          Manage roles, view active members, and invite collaborators to {org.name}.
        </p>
      </div>
      <TeamListContainer orgId={org.id} />
    </div>
  );
}
