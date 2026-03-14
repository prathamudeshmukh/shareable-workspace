import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createWorkspace,
  getWorkspace,
  addFile,
  deleteWorkspace,
  listExpiredWorkspaces,
} from "@/lib/db";
import type { D1Database } from "@cloudflare/workers-types";

// Minimal D1 mock
function makeD1Mock(rows: Record<string, unknown[]> = {}) {
  return {
    prepare: vi.fn((sql: string) => {
      const stmt = {
        bind: vi.fn((..._args: unknown[]) => stmt),
        run: vi.fn(async () => ({ success: true })),
        first: vi.fn(async () => null as unknown),
        all: vi.fn(async () => ({ results: [] as unknown[] })),
      };

      // Route by SQL keyword
      if (sql.includes("FROM files")) {
        stmt.all = vi.fn(async () => ({ results: rows["files"] ?? [] }));
      } else if (sql.includes("expires_at <")) {
        stmt.all = vi.fn(async () => ({ results: rows["expired"] ?? [] }));
      } else if (sql.includes("SELECT") && sql.includes("workspaces")) {
        stmt.first = vi.fn(async () => rows["workspace"]?.[0] ?? null);
      }

      return stmt;
    }),
    batch: vi.fn(async (stmts: unknown[]) => stmts.map(() => ({ success: true }))),
  } as unknown as D1Database;
}

describe("createWorkspace", () => {
  it("returns a workspace with correct shape", async () => {
    const db = makeD1Mock();
    const ws = await createWorkspace(db, "ws-123");
    expect(ws.id).toBe("ws-123");
    expect(ws.files).toEqual([]);
    expect(ws.expiresAt).toBeGreaterThan(ws.createdAt);
    expect(ws.expiresAt - ws.createdAt).toBe(10 * 60 * 1000);
  });

  it("does not mutate any shared object", async () => {
    const db = makeD1Mock();
    const ws1 = await createWorkspace(db, "a");
    const ws2 = await createWorkspace(db, "b");
    expect(ws1.id).not.toBe(ws2.id);
  });
});

describe("getWorkspace", () => {
  it("returns null when workspace not found", async () => {
    const db = makeD1Mock();
    const result = await getWorkspace(db, "missing");
    expect(result).toBeNull();
  });

  it("returns workspace with files when found", async () => {
    const now = Date.now();
    const db = makeD1Mock({
      workspace: [{ id: "ws-1", created_at: now, expires_at: now + 60000 }],
      files: [
        {
          id: "f-1",
          workspace_id: "ws-1",
          name: "photo.jpg",
          mime_type: "image/jpeg",
          size: 1024,
          r2_key: "workspaces/ws-1/f-1/photo.jpg",
          uploaded_at: now,
        },
      ],
    });

    const result = await getWorkspace(db, "ws-1");
    expect(result).not.toBeNull();
    expect(result!.id).toBe("ws-1");
    expect(result!.files).toHaveLength(1);
    expect(result!.files[0].name).toBe("photo.jpg");
    // r2_key must NOT be exposed on the public WorkspaceFile
    expect((result!.files[0] as unknown as Record<string, unknown>).r2Key).toBeUndefined();
  });
});

describe("addFile", () => {
  it("returns the new file with a public url", async () => {
    const db = makeD1Mock();
    const file = await addFile(db, {
      id: "f-1",
      workspaceId: "ws-1",
      name: "doc.pdf",
      mimeType: "application/pdf",
      size: 2048,
      r2Key: "workspaces/ws-1/f-1/doc.pdf",
    });
    expect(file.id).toBe("f-1");
    expect(file.url).toBe("/api/files/ws-1/f-1/doc.pdf");
    expect((file as unknown as Record<string, unknown>).r2Key).toBeUndefined();
  });
});

describe("deleteWorkspace", () => {
  it("runs without throwing", async () => {
    const db = makeD1Mock();
    await expect(deleteWorkspace(db, "ws-1")).resolves.toBeUndefined();
  });
});

describe("listExpiredWorkspaces", () => {
  it("returns empty array when none expired", async () => {
    const db = makeD1Mock();
    const result = await listExpiredWorkspaces(db);
    expect(result).toEqual([]);
  });

  it("returns expired workspaces", async () => {
    const past = Date.now() - 1000;
    const db = makeD1Mock({
      expired: [{ id: "ws-old", created_at: past - 60000, expires_at: past }],
    });
    const result = await listExpiredWorkspaces(db);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ws-old");
  });
});
