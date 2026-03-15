import { describe, it, expect, vi } from "vitest";
import { putFile, getFile, deleteFile, deleteWorkspaceFiles } from "@/lib/r2";
import type { R2Bucket } from "@cloudflare/workers-types";

function makeR2Mock(objects: string[] = []) {
  return {
    put: vi.fn(async () => null),
    get: vi.fn(async (key: string) =>
      objects.includes(key)
        ? { body: new ReadableStream(), key }
        : null
    ),
    delete: vi.fn(async () => undefined),
    list: vi.fn(async ({ prefix }: { prefix: string }) => ({
      objects: objects
        .filter((k) => k.startsWith(prefix))
        .map((key) => ({ key })),
      truncated: false,
    })),
  } as unknown as R2Bucket;
}

describe("putFile", () => {
  it("calls bucket.put with correct key and content type", async () => {
    const bucket = makeR2Mock();
    const data = new ArrayBuffer(8);
    await putFile(bucket, "workspaces/ws-1/f-1/photo.jpg", data, "image/jpeg");
    expect(bucket.put).toHaveBeenCalledWith(
      "workspaces/ws-1/f-1/photo.jpg",
      data,
      { httpMetadata: { contentType: "image/jpeg" } }
    );
  });
});

describe("getFile", () => {
  it("returns a readable stream for an existing key", async () => {
    const bucket = makeR2Mock(["workspaces/ws-1/f-1/photo.jpg"]);
    const result = await getFile(bucket, "workspaces/ws-1/f-1/photo.jpg");
    expect(result).not.toBeNull();
  });

  it("returns null for a missing key", async () => {
    const bucket = makeR2Mock([]);
    const result = await getFile(bucket, "workspaces/ws-1/missing.jpg");
    expect(result).toBeNull();
  });
});

describe("deleteFile", () => {
  it("calls bucket.delete with the given r2 key", async () => {
    const bucket = makeR2Mock(["workspaces/ws-1/f-1/photo.jpg"]);
    await deleteFile(bucket, "workspaces/ws-1/f-1/photo.jpg");
    expect(bucket.delete).toHaveBeenCalledWith("workspaces/ws-1/f-1/photo.jpg");
  });
});

describe("deleteWorkspaceFiles", () => {
  it("deletes all objects matching the workspace prefix", async () => {
    const bucket = makeR2Mock([
      "workspaces/ws-1/f-1/a.jpg",
      "workspaces/ws-1/f-2/b.pdf",
      "workspaces/ws-2/f-3/c.png",
    ]);
    await deleteWorkspaceFiles(bucket, "ws-1");
    expect(bucket.delete).toHaveBeenCalledWith([
      "workspaces/ws-1/f-1/a.jpg",
      "workspaces/ws-1/f-2/b.pdf",
    ]);
  });

  it("does nothing when workspace has no files", async () => {
    const bucket = makeR2Mock([]);
    await deleteWorkspaceFiles(bucket, "ws-empty");
    expect(bucket.delete).not.toHaveBeenCalled();
  });
});
