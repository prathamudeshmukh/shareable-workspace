import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks (hoisted before dynamic imports)
// ---------------------------------------------------------------------------

vi.mock("@/lib/get-env", () => ({
  getEnv: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getWorkspace: vi.fn(),
}));

vi.mock("@/lib/r2", () => ({
  getFile: vi.fn(),
  buildR2Key: vi.fn((wsId: string, fileId: string, name: string) => `workspaces/${wsId}/${fileId}/${name}`),
}));

vi.mock("@/lib/file-utils", () => ({
  sanitizeFilename: vi.fn((name: string) => name),
}));

// Minimal fflate stub: Zip relays chunks; only zip.end() triggers final=true in the
// top-level callback (matching real fflate behaviour — individual file completions
// do NOT set final=true on the archive-level callback).
vi.mock("fflate", () => {
  class ZipDeflate {
    name: string;
    ondata: ((err: Error | null, data: Uint8Array, final: boolean) => void) | null = null;

    constructor(name: string) {
      this.name = name;
    }

    push(data: Uint8Array, _final = false) {
      // Forward to the parent Zip callback; final is always false here — only
      // zip.end() signals the end of the archive.
      this.ondata?.(null, data, false);
    }
  }

  class Zip {
    private callback: (err: Error | null, data: Uint8Array, final: boolean) => void;

    constructor(cb: (err: Error | null, data: Uint8Array, final: boolean) => void) {
      this.callback = cb;
    }

    add(file: ZipDeflate) {
      file.ondata = (err, data) => {
        this.callback(err, data, false);
      };
    }

    end() {
      // Emit the end-of-central-directory marker as the final chunk.
      this.callback(null, new Uint8Array([0x50, 0x4b, 0x05, 0x06]), true);
    }
  }

  return { Zip, ZipDeflate };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { GET } from "@/app/api/workspace/[id]/download/route";
import { getEnv } from "@/lib/get-env";
import { getWorkspace } from "@/lib/db";
import { getFile } from "@/lib/r2";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEnv() {
  return { DB: {}, FILES: {}, RATE_LIMIT: {}, PARTYKIT_HOST: "" };
}

function makeFile(overrides = {}) {
  return {
    id: "file1",
    workspaceId: "ws1",
    name: "hello.txt",
    mimeType: "text/plain",
    size: 5,
    url: "/api/files/ws1/file1/hello.txt",
    uploadedAt: Date.now(),
    expiresAt: Date.now() + 60_000,
    ...overrides,
  };
}

function makeWorkspace(files = [makeFile()]) {
  return { id: "ws1", createdAt: Date.now(), files };
}

function makeReadableStream(content = "hello"): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(content);
  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

function makeRequest(workspaceId = "ws1") {
  return new Request(`https://example.com/api/workspace/${workspaceId}/download`);
}

function makeParams(id = "ws1") {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/workspace/[id]/download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getEnv).mockResolvedValue(makeEnv() as never);
  });

  it("returns 200 with application/zip content-type for a valid workspace", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace());
    vi.mocked(getFile).mockResolvedValue(makeReadableStream() as never);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });

  it("sets Content-Disposition with the workspace id as filename", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace());
    vi.mocked(getFile).mockResolvedValue(makeReadableStream() as never);

    const res = await GET(makeRequest(), makeParams("ws1"));

    expect(res.headers.get("Content-Disposition")).toContain("workspace-ws1.zip");
  });

  it("sets Cache-Control to no-store", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace());
    vi.mocked(getFile).mockResolvedValue(makeReadableStream() as never);

    const res = await GET(makeRequest(), makeParams());

    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 when workspace is not found", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(null);

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    expect(await res.text()).toContain("Workspace not found");
  });

  it("returns 404 when workspace has no active files", async () => {
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace([]));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(404);
    expect(await res.text()).toContain("No files");
  });

  it("calls getFile for each file in the workspace", async () => {
    const files = [makeFile({ id: "f1", name: "a.txt" }), makeFile({ id: "f2", name: "b.txt" })];
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace(files));
    // Use mockImplementation so each call gets a fresh (unlocked) ReadableStream
    vi.mocked(getFile).mockImplementation(async () => makeReadableStream() as never);

    const res = await GET(makeRequest(), makeParams());
    // Consume the stream so the async start() body runs to completion
    await res.arrayBuffer();

    expect(getFile).toHaveBeenCalledTimes(2);
  });

  it("skips files where R2 returns null and continues with remaining files", async () => {
    const files = [makeFile({ id: "f1", name: "missing.txt" }), makeFile({ id: "f2", name: "present.txt" })];
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace(files));
    vi.mocked(getFile)
      .mockResolvedValueOnce(null as never)
      .mockResolvedValueOnce(makeReadableStream() as never);

    const res = await GET(makeRequest(), makeParams());
    // Consume the stream so both getFile calls are made
    await res.arrayBuffer();

    // Still produces a valid ZIP (not an error)
    expect(res.status).toBe(200);
    expect(getFile).toHaveBeenCalledTimes(2);
  });

  it("returns 500 when getWorkspace throws", async () => {
    vi.mocked(getWorkspace).mockRejectedValue(new Error("D1 error"));

    const res = await GET(makeRequest(), makeParams());

    expect(res.status).toBe(500);
    expect(await res.text()).toContain("Internal server error");
  });
});
