import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { KVNamespace } from "@cloudflare/workers-types";

// ---------------------------------------------------------------------------
// Module mocks (must be hoisted before dynamic imports)
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  createWorkspace: vi.fn(),
}));

vi.mock("@/lib/get-env", () => ({
  getEnv: vi.fn(),
}));

vi.mock("nanoid", () => ({ nanoid: vi.fn(() => "abc1234") }));

// ---------------------------------------------------------------------------
// Imports (after mocks are set up)
// ---------------------------------------------------------------------------

import { POST } from "@/app/api/workspace/route";
import { createWorkspace } from "@/lib/db";
import { getEnv } from "@/lib/get-env";
import { RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockKV(currentCount = 0): KVNamespace {
  return {
    get: vi.fn(async () => (currentCount > 0 ? String(currentCount) : null)),
    put: vi.fn(async () => {}),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function makeEnv(kvCount = 0) {
  return {
    DB: {},
    FILES: {},
    RATE_LIMIT: makeMockKV(kvCount),
    PARTYKIT_HOST: "https://example.partykit.dev",
  };
}

function makeRequest(ip = "1.2.3.4") {
  return new Request("https://example.com/api/workspace", {
    method: "POST",
    headers: { "cf-connecting-ip": ip },
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/workspace", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createWorkspace).mockResolvedValue({ id: "abc1234", createdAt: Date.now(), files: [] });
  });

  it("returns 201 and the new workspace id when under the rate limit", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ id: "abc1234" });
  });

  it("calls createWorkspace with the generated id", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    await POST(makeRequest());
    expect(createWorkspace).toHaveBeenCalledWith(expect.anything(), "abc1234");
  });

  it("returns 429 when the IP has reached the workspace creation limit", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(RATE_LIMITS.workspaceCreations) as never);
    const res = await POST(makeRequest());
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Too many") });
  });

  it("does not call createWorkspace when rate-limited", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(RATE_LIMITS.workspaceCreations) as never);
    await POST(makeRequest());
    expect(createWorkspace).not.toHaveBeenCalled();
  });

  it("treats different IPs as independent rate limit counters", async () => {
    // IP A is at the limit, IP B has no usage
    const kvA = makeMockKV(RATE_LIMITS.workspaceCreations);
    const kvB = makeMockKV(0);

    vi.mocked(getEnv)
      .mockResolvedValueOnce({ ...makeEnv(), RATE_LIMIT: kvA } as never)
      .mockResolvedValueOnce({ ...makeEnv(), RATE_LIMIT: kvB } as never);

    const resA = await POST(makeRequest("1.1.1.1"));
    const resB = await POST(makeRequest("2.2.2.2"));

    expect(resA.status).toBe(429);
    expect(resB.status).toBe(201);
  });

  it("returns 500 when createWorkspace throws", async () => {
    vi.mocked(getEnv).mockResolvedValue(makeEnv(0) as never);
    vi.mocked(createWorkspace).mockRejectedValueOnce(new Error("D1 error"));
    const res = await POST(makeRequest());
    expect(res.status).toBe(500);
  });
});
