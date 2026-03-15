import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { KVNamespace } from "@cloudflare/workers-types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/get-env", () => ({ getEnv: vi.fn() }));
vi.mock("@/lib/db", () => ({ getWorkspace: vi.fn(), addFile: vi.fn() }));
vi.mock("@/lib/r2", () => ({ putFile: vi.fn(), buildR2Key: vi.fn(() => "r2/key") }));
vi.mock("@/lib/partykit", () => ({ broadcastToWorkspace: vi.fn() }));
vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "file123") }));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/workspace/[id]/upload/route";
import { getWorkspace, addFile } from "@/lib/db";
import { putFile } from "@/lib/r2";
import { getEnv } from "@/lib/get-env";
import { RATE_LIMITS } from "@/lib/rate-limit";
import { MAX_FILE_SIZE_BYTES } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_ID = "ws12345";

function makeMockKV(usedBytes = 0): KVNamespace {
  return {
    get: vi.fn(async () => (usedBytes > 0 ? String(usedBytes) : null)),
    put: vi.fn(async () => {}),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function makeEnv(kvUsedBytes = 0) {
  return {
    DB: {},
    FILES: {},
    RATE_LIMIT: makeMockKV(kvUsedBytes),
    PARTYKIT_HOST: "https://example.partykit.dev",
  };
}

function makeWorkspace(fileCount = 0) {
  return {
    id: WORKSPACE_ID,
    createdAt: Date.now(),
    files: Array.from({ length: fileCount }, (_, i) => ({ id: `f${i}` })),
  };
}

function makeFile(name: string, sizeBytes: number, type = "text/plain"): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

function makeUploadRequest(files: File[], ip = "1.2.3.4"): Request {
  const form = new FormData();
  files.forEach((f) => form.append("files", f));
  // Return a mock Request to avoid the multipart serialization round-trip
  // that causes jsdom/undici to reconstruct Blobs instead of File instances,
  // which would break the `instanceof File` guard in the route handler.
  return {
    headers: new Headers({ "cf-connecting-ip": ip }),
    formData: async () => form,
  } as unknown as Request;
}

function params(id = WORKSPACE_ID) {
  return { params: Promise.resolve({ id }) };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/workspace/[id]/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkspace).mockResolvedValue(makeWorkspace(0) as never);
    vi.mocked(addFile).mockResolvedValue({
      id: "file123",
      workspaceId: WORKSPACE_ID,
      name: "test.txt",
      mimeType: "text/plain",
      size: 100,
      url: "https://example.com/files/test.txt",
      uploadedAt: Date.now(),
      expiresAt: Date.now() + 600_000,
    });
    vi.mocked(putFile).mockResolvedValue(undefined as never);
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it("returns 201 with uploaded file data on success", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    const req = makeUploadRequest([makeFile("test.txt", 100)]);
    const res = await POST(req, params());
    expect(res.status).toBe(201);
    expect(await res.json()).toHaveProperty("files");
  });

  it("calls putFile and addFile for each uploaded file", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    const req = makeUploadRequest([makeFile("a.txt", 50), makeFile("b.txt", 50)]);
    await POST(req, params());
    expect(putFile).toHaveBeenCalledTimes(2);
    expect(addFile).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Rate limiting
  // -------------------------------------------------------------------------

  it("returns 429 when the IP upload byte limit is exceeded", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(RATE_LIMITS.uploadBytes) as never);
    const req = makeUploadRequest([makeFile("big.bin", 1)]);
    const res = await POST(req, params());
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Upload limit") });
  });

  it("does not write to R2 when rate-limited", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(RATE_LIMITS.uploadBytes) as never);
    const req = makeUploadRequest([makeFile("big.bin", 1)]);
    await POST(req, params());
    expect(putFile).not.toHaveBeenCalled();
  });

  it("allows upload when bytes used is exactly one byte below the limit", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(RATE_LIMITS.uploadBytes - 1) as never);
    const req = makeUploadRequest([makeFile("tiny.txt", 1)]);
    const res = await POST(req, params());
    expect(res.status).toBe(201);
  });

  // -------------------------------------------------------------------------
  // Input validation
  // -------------------------------------------------------------------------

  it("returns 404 when workspace does not exist", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    vi.mocked(getWorkspace).mockResolvedValueOnce(null);
    const req = makeUploadRequest([makeFile("test.txt", 100)]);
    const res = await POST(req, params());
    expect(res.status).toBe(404);
  });

  it("returns 400 when no files are provided", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    const req = makeUploadRequest([]);
    const res = await POST(req, params());
    expect(res.status).toBe(400);
  });

  it("returns 400 when upload would exceed the workspace file cap", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    vi.mocked(getWorkspace).mockResolvedValueOnce(makeWorkspace(20) as never);
    const req = makeUploadRequest([makeFile("extra.txt", 100)]);
    const res = await POST(req, params());
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("full") });
  });

  it("returns 413 when a single file exceeds the per-file size limit", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    const oversized = makeFile("huge.bin", MAX_FILE_SIZE_BYTES + 1);
    const req = makeUploadRequest([oversized]);
    const res = await POST(req, params());
    expect(res.status).toBe(413);
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it("returns 500 when R2 write fails", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    vi.mocked(putFile).mockRejectedValueOnce(new Error("R2 error"));
    const req = makeUploadRequest([makeFile("test.txt", 100)]);
    const res = await POST(req, params());
    expect(res.status).toBe(500);
  });
});
