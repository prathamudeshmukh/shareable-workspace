import type { D1Database } from "@cloudflare/workers-types";
import type {
  Workspace,
  WorkspaceFile,
  WorkspaceRow,
  WorkspaceFileRow,
} from "@/types/workspace";
import { WORKSPACE_TTL_MS } from "@/lib/constants";
import { buildFileUrl } from "@/lib/file-utils";

interface AddFileInput {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  r2Key: string;
}

function rowToFile(row: WorkspaceFileRow): WorkspaceFile {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    mimeType: row.mime_type,
    size: row.size,
    url: buildFileUrl(row.workspace_id, row.id, row.name),
    uploadedAt: row.uploaded_at,
  };
}

export async function createWorkspace(
  db: D1Database,
  id: string
): Promise<Workspace> {
  const createdAt = Date.now();
  const expiresAt = createdAt + WORKSPACE_TTL_MS;

  await db
    .prepare(
      "INSERT INTO workspaces (id, created_at, expires_at) VALUES (?, ?, ?)"
    )
    .bind(id, createdAt, expiresAt)
    .run();

  return { id, createdAt, expiresAt, files: [] };
}

export async function getWorkspace(
  db: D1Database,
  id: string
): Promise<Workspace | null> {
  const row = await db
    .prepare("SELECT id, created_at, expires_at FROM workspaces WHERE id = ?")
    .bind(id)
    .first<WorkspaceRow>();

  if (!row) return null;

  const { results } = await db
    .prepare(
      `SELECT id, workspace_id, name, mime_type, size, r2_key, uploaded_at
       FROM files WHERE workspace_id = ? ORDER BY uploaded_at ASC`
    )
    .bind(id)
    .all<WorkspaceFileRow>();

  return {
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    files: results.map(rowToFile),
  };
}

export async function addFile(
  db: D1Database,
  input: AddFileInput
): Promise<WorkspaceFile> {
  const uploadedAt = Date.now();

  await db
    .prepare(
      `INSERT INTO files (id, workspace_id, name, mime_type, size, r2_key, uploaded_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      input.id,
      input.workspaceId,
      input.name,
      input.mimeType,
      input.size,
      input.r2Key,
      uploadedAt
    )
    .run();

  return {
    id: input.id,
    workspaceId: input.workspaceId,
    name: input.name,
    mimeType: input.mimeType,
    size: input.size,
    url: buildFileUrl(input.workspaceId, input.id, input.name),
    uploadedAt,
  };
}

export async function deleteWorkspace(
  db: D1Database,
  id: string
): Promise<void> {
  await db
    .prepare("DELETE FROM workspaces WHERE id = ?")
    .bind(id)
    .run();
}

export async function listExpiredWorkspaces(
  db: D1Database
): Promise<Workspace[]> {
  const now = Date.now();
  const { results } = await db
    .prepare(
      "SELECT id, created_at, expires_at FROM workspaces WHERE expires_at < ?"
    )
    .bind(now)
    .all<WorkspaceRow>();

  return results.map((row) => ({
    id: row.id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    files: [],
  }));
}
