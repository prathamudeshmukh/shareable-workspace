import { listExpiredWorkspaces, deleteWorkspace } from "@/lib/db";
import { deleteWorkspaceFiles } from "@/lib/r2";
import { broadcastToWorkspace } from "@/lib/partykit";
import type {
  D1Database,
  R2Bucket,
  ScheduledEvent,
  ExecutionContext,
} from "@cloudflare/workers-types";

interface CleanupEnv {
  DB: D1Database;
  FILES: R2Bucket;
  PARTYKIT_HOST: string;
  PARTYKIT_SECRET?: string;
}

export async function runCleanup(env: CleanupEnv): Promise<void> {
  const expired = await listExpiredWorkspaces(env.DB);

  if (expired.length === 0) return;

  console.info(`[cleanup] found ${expired.length} expired workspace(s)`);

  await Promise.all(
    expired.map(async (workspace) => {
      // 1. Notify connected clients before data is gone
      await broadcastToWorkspace(
        env.PARTYKIT_HOST,
        workspace.id,
        { type: "workspace_expired" },
        env.PARTYKIT_SECRET
      );

      // 2. Delete files from R2
      await deleteWorkspaceFiles(env.FILES, workspace.id);

      // 3. Delete workspace row from D1 (cascades to files table)
      await deleteWorkspace(env.DB, workspace.id);

      console.info(
        `[cleanup] deleted workspace ${workspace.id}`
      );
    })
  );
}

// Cloudflare Cron Trigger handler — wired via wrangler.toml [triggers] crons
export default {
  async scheduled(
    _event: ScheduledEvent,
    env: CleanupEnv,
    _ctx: ExecutionContext
  ): Promise<void> {
    await runCleanup(env);
  },
};
