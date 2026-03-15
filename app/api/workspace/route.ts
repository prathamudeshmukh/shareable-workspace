import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getEnv } from "@/lib/get-env";
import { createWorkspace } from "@/lib/db";

export async function POST(): Promise<NextResponse> {
  try {
    const env = await getEnv();
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
