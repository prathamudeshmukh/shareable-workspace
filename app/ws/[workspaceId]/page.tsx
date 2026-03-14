import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceRoute({ params }: Props) {
  const { workspaceId } = await params;
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";

  const res = await fetch(
    `${protocol}://${host}/api/workspace/${workspaceId}`,
    { cache: "no-store" }
  );

  if (!res.ok) notFound();

  const workspace = await res.json();

  return <WorkspacePage workspace={workspace} />;
}
