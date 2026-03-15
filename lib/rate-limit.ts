import type { KVNamespace } from "@cloudflare/workers-types";

const WINDOW_MS = 10 * 60 * 1000; // 10-minute fixed window
const WINDOW_TTL_S = 20 * 60;     // KV key lives two windows for safety

export const RATE_LIMITS = {
  workspaceCreations: 5,                   // workspaces per IP per 10 min
  uploadBytes: 500 * 1024 * 1024,          // 500 MB per IP per 10 min
} as const;

function windowKey(action: string, ip: string): string {
  const window = Math.floor(Date.now() / WINDOW_MS);
  return `rl:${action}:${ip}:${window}`;
}

/**
 * Increments the counter for the given action+IP window.
 * Returns true if the request is allowed, false if the limit is exceeded.
 */
export async function checkRateLimit(
  kv: KVNamespace,
  action: string,
  ip: string,
  increment: number,
  limit: number,
): Promise<boolean> {
  const key = windowKey(action, ip);
  const current = parseInt((await kv.get(key)) ?? "0", 10);

  if (current + increment > limit) return false;

  await kv.put(key, String(current + increment), { expirationTtl: WINDOW_TTL_S });
  return true;
}

export function getClientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}
