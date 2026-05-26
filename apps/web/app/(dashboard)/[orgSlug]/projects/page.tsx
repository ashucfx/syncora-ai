import type { Metadata } from "next";
import { db } from "@syncora/db";
import { redirect } from "next/navigation";
import { ProjectListContainer } from "./project-list-container";

export const metadata: Metadata = { title: "Projects - Syncora" };

interface ProjectsPageProps {
  params: Promise<{ orgSlug: string }>;
}

export default async function ProjectsPage({ params }: ProjectsPageProps) {
  const { orgSlug } = await params;

  const org = await db.query.organizations.findFirst({
    where: (o, { eq }) => eq(o.slug, orgSlug),
    columns: { id: true, name: true },
  });

  if (!org) redirect("/dashboard");

  // Fetch client options for the add project dropdown
  const orgClients = await db.query.clients.findMany({
    where: (c, { eq }) => eq(c.organizationId, org.id),
    columns: { id: true, name: true, company: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
        <p className="text-muted-foreground mt-1">
          Plan, track progress, and manage tasks for {org.name}.
        </p>
      </div>
      <ProjectListContainer orgId={org.id} clients={orgClients} />
    </div>
  );
}
