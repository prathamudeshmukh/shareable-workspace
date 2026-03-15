import { NextResponse } from "next/server";
import { getEnv } from "@/lib/get-env";
import { getFileRecord, deleteFile as deleteFileDb } from "@/lib/db";
import { deleteFile as deleteFileR2 } from "@/lib/r2";
import { broadcastToWorkspace } from "@/lib/partykit";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id, fileId } = await params;
    const env = await getEnv();

    const record = await getFileRecord(env.DB, fileId, id);
    if (!record) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    await deleteFileR2(env.FILES, record.r2Key);
    await deleteFileDb(env.DB, fileId);

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
