import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getEnv } from "@/lib/get-env";
import { createWorkspace } from "@/lib/db";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const env = await getEnv();

    const ip = getClientIp(req);
    const allowed = await checkRateLimit(env.RATE_LIMIT, "create", ip, 1, RATE_LIMITS.workspaceCreations);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many workspaces created. Please wait a few minutes." },
        { status: 429 }
      );
    }

    const id = nanoid(7);
    const workspace = await createWorkspace(env.DB, id);

    return NextResponse.json({ id: workspace.id }, { status: 201 });
  } catch (error) {
    console.error("[workspace] create failed:", error);
    return NextResponse.json(
      { error: "Failed to create workspace", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
