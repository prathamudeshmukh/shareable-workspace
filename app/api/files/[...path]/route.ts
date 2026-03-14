import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getWorkspace } from "@/lib/db";
import { getFile, buildR2Key } from "@/lib/r2";
import { sanitizeFilename } from "@/lib/file-utils";

type Params = { params: Promise<{ path: string[] }> };

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  try {
    const { path } = await params;

    // Expect: [workspaceId, fileId, filename]
    if (!path || path.length < 3) {
      return new Response("Not found", { status: 404 });
    }

    const [workspaceId, fileId, ...rest] = path;
    const filename = rest.join("/");

    // Guard against path traversal in every segment
    if ([workspaceId, fileId, filename].some((s) => s.includes(".."))) {
      return new Response("Bad request", { status: 400 });
    }

    const { env } = await getCloudflareContext({ async: true });

    const workspace = await getWorkspace(env.DB, workspaceId);
    if (!workspace || workspace.expiresAt < Date.now()) {
      return new Response("Workspace not found or expired", { status: 404 });
    }

    const safeName = sanitizeFilename(filename);
    const r2Key = buildR2Key(workspaceId, fileId, safeName);
    const fileBody = await getFile(env.FILES, r2Key);

    if (!fileBody) {
      return new Response("File not found", { status: 404 });
    }

    // Find the matching file's MIME type from workspace metadata
    const meta = workspace.files.find((f) => f.id === fileId);
    const contentType = meta?.mimeType ?? "application/octet-stream";

    return new Response(fileBody as ReadableStream, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=600",
      },
    });
  } catch (error) {
    console.error("[files] serve failed:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
