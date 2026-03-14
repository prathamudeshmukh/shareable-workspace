import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createWorkspace } from "@/lib/db";

export async function POST(): Promise<NextResponse> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const id = uuidv4();
    const workspace = await createWorkspace(env.DB, id);

    return NextResponse.json(
      { id: workspace.id, expiresAt: workspace.expiresAt },
      { status: 201 }
    );
  } catch (error) {
    console.error("[workspace] create failed:", error);
    return NextResponse.json(
      { error: "Failed to create workspace" },
      { status: 500 }
    );
  }
}
