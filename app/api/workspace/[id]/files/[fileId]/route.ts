import { NextResponse } from "next/server";
import { getEnv } from "@/lib/get-env";
import { deleteFile as deleteFileDb } from "@/lib/db";
import { deleteFileByPrefix } from "@/lib/r2";
import { broadcastToWorkspace } from "@/lib/partykit";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id, fileId } = await params;
    const env = await getEnv();

    await deleteFileDb(env.DB, fileId);
    await deleteFileByPrefix(env.FILES, id, fileId);

    // Broadcast to all connected clients so other tabs update immediately
    await broadcastToWorkspace(
      env.PARTYKIT_HOST,
      id,
      { type: "file_expired", fileId },
      env.PARTYKIT_SECRET
    );

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[workspace] delete file failed:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
