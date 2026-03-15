import { notFound } from "next/navigation";
import { getEnv } from "@/lib/get-env";
import { getWorkspace } from "@/lib/db";
import { WorkspacePage } from "@/components/workspace/WorkspacePage";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ workspaceId: string }>;
}

export default async function WorkspaceRoute({ params }: Props) {
  const { workspaceId } = await params;
  const env = await getEnv();
  const workspace = await getWorkspace(env.DB, workspaceId);

  if (!workspace) notFound();

  return <WorkspacePage workspace={workspace} />;
}
