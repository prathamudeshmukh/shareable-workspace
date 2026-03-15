import { listExpiredFiles, deleteFile } from "@/lib/db";
import { deleteFile as deleteR2File } from "@/lib/r2";
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
  const expired = await listExpiredFiles(env.DB);

  if (expired.length === 0) return;

  console.info(`[cleanup] found ${expired.length} expired file(s)`);

  await Promise.all(
    expired.map(async (file) => {
      // 1. Notify connected clients before data is gone
      await broadcastToWorkspace(
        env.PARTYKIT_HOST,
        file.workspaceId,
        { type: "file_expired", fileId: file.id },
        env.PARTYKIT_SECRET
      );

      // 2. Delete file from R2
      await deleteR2File(env.FILES, file.r2Key);

      // 3. Delete file row from D1
      await deleteFile(env.DB, file.id);

      console.info(`[cleanup] deleted file ${file.id} from workspace ${file.workspaceId}`);
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
