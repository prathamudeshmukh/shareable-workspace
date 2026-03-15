import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getEnv } from "@/lib/get-env";
import { getWorkspace, addFile } from "@/lib/db";
import { putFile, buildR2Key } from "@/lib/r2";
import { broadcastToWorkspace } from "@/lib/partykit";
import { sanitizeFilename } from "@/lib/file-utils";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD, MAX_FILES_PER_WORKSPACE } from "@/lib/constants";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params): Promise<NextResponse> {
  try {
    const { id } = await params;
    const env = await getEnv();

    const workspace = await getWorkspace(env.DB, id);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const formData = await req.formData();
    const rawFiles = formData.getAll("files");

    const uploadedFiles = rawFiles.filter((f): f is File => f instanceof File);
    const totalBytes = uploadedFiles.reduce((sum, f) => sum + f.size, 0);
    const ip = getClientIp(req);
    const allowed = await checkRateLimit(env.RATE_LIMIT, "upload", ip, totalBytes, RATE_LIMITS.uploadBytes);
    if (!allowed) {
      return NextResponse.json(
        { error: "Upload limit reached. Please wait a few minutes before uploading more." },
        { status: 429 }
      );
    }

    if (uploadedFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const currentCount = workspace.files.length;
    const remaining = MAX_FILES_PER_WORKSPACE - currentCount;
    if (uploadedFiles.length > remaining) {
      return NextResponse.json(
        { error: remaining === 0 ? "Workspace is full" : `Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed in this workspace` },
        { status: 400 }
      );
    }

    if (uploadedFiles.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_UPLOAD} files per upload` },
        { status: 400 }
      );
    }

    const oversized = uploadedFiles.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      return NextResponse.json(
        { error: `File "${oversized.name}" exceeds the 50 MB limit` },
        { status: 413 }
      );
    }

    // Process each file: write to R2 then record in D1
    const newFiles = await Promise.all(
      uploadedFiles.map(async (file) => {
        const fileId = nanoid(7);
        const safeName = sanitizeFilename(file.name);
        const r2Key = buildR2Key(id, fileId, safeName);
        const buffer = await file.arrayBuffer();

        await putFile(env.FILES, r2Key, buffer, file.type || "application/octet-stream");

        return addFile(env.DB, {
          id: fileId,
          workspaceId: id,
          name: safeName,
          mimeType: file.type || "application/octet-stream",
          size: file.size,
          r2Key,
        });
      })
    );

    // Broadcast to all PartyKit clients — fire-and-forget
    await broadcastToWorkspace(
      env.PARTYKIT_HOST,
      id,
      { type: "files_added", files: newFiles },
      env.PARTYKIT_SECRET
    );

    return NextResponse.json({ files: newFiles }, { status: 201 });
  } catch (error) {
    console.error("[workspace] upload failed:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
