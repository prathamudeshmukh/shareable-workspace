import { Zip, ZipDeflate } from "fflate";
import { getEnv } from "@/lib/get-env";
import { getWorkspace } from "@/lib/db";
import { getFile, buildR2Key } from "@/lib/r2";
import { sanitizeFilename } from "@/lib/file-utils";
import type { WorkspaceFile } from "@/types/workspace";

type Params = { params: Promise<{ id: string }> };

// MIME types that are already compressed — store without re-compressing.
const PRECOMPRESSED_PREFIXES = ["image/", "video/", "audio/"];
const PRECOMPRESSED_EXACT = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/pdf",
  "application/gzip",
  "application/x-bzip2",
  "application/x-7z-compressed",
]);

function compressionLevel(mimeType: string): 0 | 6 {
  if (PRECOMPRESSED_PREFIXES.some((p) => mimeType.startsWith(p))) return 0;
  if (PRECOMPRESSED_EXACT.has(mimeType)) return 0;
  return 6;
}

// Ensures every name added to the ZIP is unique within that archive.
function makeNameDeduplicator() {
  const used = new Set<string>();

  return function uniqueName(name: string): string {
    if (!used.has(name)) {
      used.add(name);
      return name;
    }

    const dotIndex = name.lastIndexOf(".");
    const base = dotIndex > 0 ? name.slice(0, dotIndex) : name;
    const ext = dotIndex > 0 ? name.slice(dotIndex) : "";

    let counter = 1;
    let candidate = `${base} (${counter})${ext}`;
    while (used.has(candidate)) {
      counter += 1;
      candidate = `${base} (${counter})${ext}`;
    }

    used.add(candidate);
    return candidate;
  };
}

async function streamFilesIntoZip(
  zip: Zip,
  files: WorkspaceFile[],
  workspaceId: string,
  bucket: unknown,
  deduplicate: (name: string) => string
): Promise<void> {
  for (const file of files) {
    const safeName = sanitizeFilename(file.name);
    const r2Key = buildR2Key(workspaceId, file.id, safeName);
    const body = await getFile(bucket as Parameters<typeof getFile>[0], r2Key);

    if (!body) continue;

    const entryName = deduplicate(safeName);
    const entry = new ZipDeflate(entryName, { level: compressionLevel(file.mimeType) });
    zip.add(entry);

    const reader = (body as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        entry.push(new Uint8Array(0), true);
        break;
      }
      entry.push(value);
    }
  }
}

export async function GET(_req: Request, { params }: Params): Promise<Response> {
  try {
    const { id } = await params;

    const env = await getEnv();
    const workspace = await getWorkspace(env.DB, id);

    if (!workspace) {
      return new Response("Workspace not found", { status: 404 });
    }

    if (workspace.files.length === 0) {
      return new Response("No files to download", { status: 404 });
    }

    const deduplicate = makeNameDeduplicator();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const zip = new Zip((err, chunk, final) => {
          if (err) {
            controller.error(err);
            return;
          }
          controller.enqueue(chunk);
          if (final) controller.close();
        });

        try {
          await streamFilesIntoZip(zip, workspace.files, id, env.FILES, deduplicate);
          zip.end();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="workspace-${id}.zip"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[download] zip generation failed:", error);
    return new Response("Internal server error", { status: 500 });
  }
}
