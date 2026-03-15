import { NextResponse } from "next/server";
import { getEnv } from "@/lib/get-env";
import { deleteFile as deleteFileDb } from "@/lib/db";
import { deleteFileByPrefix } from "@/lib/r2";
import { broadcastToWorkspace } from "@/lib/partykit";

type Params = { params: Promise<{ id: string; fileId: string }> };

export async function DELETE(_req: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id, fileId } = await params;
    console.log(`[delete] workspaceId=${id} fileId=${fileId}`);

    const env = await getEnv();

    await deleteFileDb(env.DB, fileId);
    console.log(`[delete] db record removed fileId=${fileId}`);

    await deleteFileByPrefix(env.FILES, id, fileId);
    console.log(`[delete] r2 objects removed prefix=workspaces/${id}/${fileId}/`);

    await broadcastToWorkspace(
      env.PARTYKIT_HOST,
      id,
      { type: "file_expired", fileId },
      env.PARTYKIT_SECRET
    );
    console.log(`[delete] broadcast sent workspaceId=${id} fileId=${fileId}`);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error(`[delete] failed:`, error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
