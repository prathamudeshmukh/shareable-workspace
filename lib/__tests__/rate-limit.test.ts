import { describe, it, expect, vi, beforeEach } from "vitest";
import type { KVNamespace } from "@cloudflare/workers-types";
import { checkRateLimit, getClientIp, RATE_LIMITS } from "@/lib/rate-limit";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockKV(initial: Record<string, string> = {}): KVNamespace {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null),
    put: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    delete: vi.fn(),
    list: vi.fn(),
    getWithMetadata: vi.fn(),
  } as unknown as KVNamespace;
}

function makeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://example.com", { headers });
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

describe("checkRateLimit", () => {
  it("allows first request when KV has no prior count", async () => {
    const kv = makeMockKV();
    const allowed = await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(allowed).toBe(true);
  });

  it("persists incremented count to KV after allowing", async () => {
    const kv = makeMockKV();
    await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(kv.put).toHaveBeenCalledWith(
      expect.stringContaining("rl:create:1.2.3.4:"),
      "1",
      expect.objectContaining({ expirationTtl: expect.any(Number) }),
    );
  });

  it("allows request that lands exactly on the limit", async () => {
    const kv = makeMockKV();
    // Seed counter to limit - 1
    vi.mocked(kv.get).mockResolvedValueOnce("4");
    const allowed = await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(allowed).toBe(true);
  });

  it("blocks request that would exceed the limit", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get).mockResolvedValueOnce("5");
    const allowed = await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(allowed).toBe(false);
  });

  it("does not write to KV when request is blocked", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get).mockResolvedValueOnce("5");
    await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(kv.put).not.toHaveBeenCalled();
  });

  it("accumulates large byte increments against the upload limit", async () => {
    const kv = makeMockKV();
    const halfLimit = RATE_LIMITS.uploadBytes / 2;
    vi.mocked(kv.get).mockResolvedValueOnce(String(halfLimit));
    // Second half-limit upload should still be allowed (exactly at limit)
    const allowed = await checkRateLimit(kv, "upload", "1.2.3.4", halfLimit, RATE_LIMITS.uploadBytes);
    expect(allowed).toBe(true);
  });

  it("blocks upload that would push total over the byte limit", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get).mockResolvedValueOnce(String(RATE_LIMITS.uploadBytes - 1));
    const allowed = await checkRateLimit(kv, "upload", "1.2.3.4", 2, RATE_LIMITS.uploadBytes);
    expect(allowed).toBe(false);
  });

  it("uses separate window keys for different IPs", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get)
      .mockResolvedValueOnce("5") // IP A is at limit
      .mockResolvedValueOnce("0"); // IP B has no usage
    const blockedA = await checkRateLimit(kv, "create", "1.1.1.1", 1, 5);
    const allowedB = await checkRateLimit(kv, "create", "2.2.2.2", 1, 5);
    expect(blockedA).toBe(false);
    expect(allowedB).toBe(true);
  });

  it("uses separate window keys for different actions", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get)
      .mockResolvedValueOnce("5") // "create" is at limit
      .mockResolvedValueOnce("0"); // "upload" has no usage
    const blockedCreate = await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    const allowedUpload = await checkRateLimit(kv, "upload", "1.2.3.4", 1, 5);
    expect(blockedCreate).toBe(false);
    expect(allowedUpload).toBe(true);
  });

  it("treats a missing KV value as zero (new window)", async () => {
    const kv = makeMockKV();
    vi.mocked(kv.get).mockResolvedValueOnce(null);
    const allowed = await checkRateLimit(kv, "create", "1.2.3.4", 1, 5);
    expect(allowed).toBe(true);
    expect(kv.put).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.any(Object),
    );
  });
});

// ---------------------------------------------------------------------------
// getClientIp
// ---------------------------------------------------------------------------

describe("getClientIp", () => {
  it("returns cf-connecting-ip when present", () => {
    const req = makeRequest({ "cf-connecting-ip": "1.2.3.4" });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("falls back to first IP in x-forwarded-for when cf-connecting-ip absent", () => {
    const req = makeRequest({ "x-forwarded-for": "5.6.7.8, 9.10.11.12" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });

  it("prefers cf-connecting-ip over x-forwarded-for", () => {
    const req = makeRequest({
      "cf-connecting-ip": "1.2.3.4",
      "x-forwarded-for": "9.9.9.9",
    });
    expect(getClientIp(req)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const req = makeRequest();
    expect(getClientIp(req)).toBe("unknown");
  });

  it("trims whitespace from x-forwarded-for values", () => {
    const req = makeRequest({ "x-forwarded-for": "  5.6.7.8  , 9.10.11.12" });
    expect(getClientIp(req)).toBe("5.6.7.8");
  });
});

// ---------------------------------------------------------------------------
// RATE_LIMITS constants
// ---------------------------------------------------------------------------

describe("RATE_LIMITS", () => {
  it("workspace creation limit is a positive integer", () => {
    expect(RATE_LIMITS.workspaceCreations).toBeGreaterThan(0);
    expect(Number.isInteger(RATE_LIMITS.workspaceCreations)).toBe(true);
  });

  it("upload byte limit is at least 1 MB", () => {
    expect(RATE_LIMITS.uploadBytes).toBeGreaterThanOrEqual(1024 * 1024);
  });
});
