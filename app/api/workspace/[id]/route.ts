import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getWorkspace } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing workspace id" }, { status: 400 });
    }

    const { env } = await getCloudflareContext({ async: true });
    const workspace = await getWorkspace(env.DB, id);

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    if (workspace.expiresAt < Date.now()) {
      return NextResponse.json({ error: "Workspace expired" }, { status: 404 });
    }

    return NextResponse.json(workspace);
  } catch (error) {
    console.error("[workspace] get failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch workspace" },
      { status: 500 }
    );
  }
}
