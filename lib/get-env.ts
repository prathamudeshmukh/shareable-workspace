import type { D1Database, R2Bucket } from "@cloudflare/workers-types";

export interface AppEnv {
  DB: D1Database;
  FILES: R2Bucket;
  PARTYKIT_HOST: string;
  PARTYKIT_SECRET?: string;
}

// Cache the dev proxy so we don't spin up a new Miniflare instance per request
let devProxy: AppEnv | null = null;

async function getDevEnv(): Promise<AppEnv> {
  if (!devProxy) {
    // Obfuscated import defeats esbuild/webpack static analysis so `wrangler`
    // (and its `node:sqlite` dep) is never included in the production bundle.
    // This is the same pattern used by @opennextjs/cloudflare internally.
    // Obfuscated import defeats esbuild/webpack static analysis so `wrangler`
    // (and its `node:sqlite` dep) is never included in the production bundle.
    // This is the same pattern used by @opennextjs/cloudflare internally.
    const { getPlatformProxy } = await import(
      /* webpackIgnore: true */ `${"__wrangler".replaceAll("_", "")}` as string
    ) as typeof import("wrangler");
    const proxy = await getPlatformProxy<AppEnv>();
    devProxy = proxy.env;
  }
  return devProxy as AppEnv;
}

export async function getEnv(): Promise<AppEnv> {
  if (process.env.NODE_ENV === "development") {
    return getDevEnv();
  }

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  return env as AppEnv;
}
