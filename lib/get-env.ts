import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export interface AppEnv {
  DB: D1Database;
  FILES: R2Bucket;
  PARTYKIT_HOST: string;
  PARTYKIT_SECRET?: string;
}

// Cache the full proxy on globalThis so it survives Next.js HMR module reloads.
// Storing only proxy.env (as before) let the Miniflare instance be GC'd and
// its in-memory D1 wiped — causing 404s on subsequent requests after a reload.
type DevProxy = Awaited<ReturnType<typeof import("wrangler")["getPlatformProxy"]>>;
const g = globalThis as { __devProxy?: DevProxy };

async function getDevEnv(): Promise<AppEnv> {
  if (!g.__devProxy) {
    // Obfuscated import defeats esbuild/webpack static analysis so `wrangler`
    // (and its `node:sqlite` dep) is never included in the production bundle.
    // This is the same pattern used by @opennextjs/cloudflare internally.
    const { getPlatformProxy } = await import(
      /* webpackIgnore: true */ `${"__wrangler".replaceAll("_", "")}` as string
    ) as typeof import("wrangler");
    g.__devProxy = await getPlatformProxy<AppEnv>();
  }
  return g.__devProxy.env as AppEnv;
}

export async function getEnv(): Promise<AppEnv> {
  if (process.env.NODE_ENV === "development") {
    return getDevEnv();
  }

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return env as AppEnv;
}
