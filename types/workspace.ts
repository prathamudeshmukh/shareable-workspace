import { z } from "zod";

// ---- Domain types ----

export interface WorkspaceFile {
  id: string;
  workspaceId: string;
  name: string;
  mimeType: string;
  size: number;
  url: string; // /api/files/[workspaceId]/[fileId]/[name]
  uploadedAt: number; // epoch ms
}

export interface Workspace {
  id: string;
  createdAt: number; // epoch ms
  expiresAt: number; // epoch ms
  files: WorkspaceFile[];
}

// r2_key is server-only — stored in D1, never sent to clients
export interface WorkspaceFileRow {
  id: string;
  workspace_id: string;
  name: string;
  mime_type: string;
  size: number;
  r2_key: string;
  uploaded_at: number;
}

export interface WorkspaceRow {
  id: string;
  created_at: number;
  expires_at: number;
}

// ---- Zod schemas (API boundary validation) ----

export const WorkspaceFileSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1),
  size: z.number().int().positive(),
  url: z.string().startsWith("/api/files/"),
  uploadedAt: z.number().int().positive(),
});

export const WorkspaceSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
  files: z.array(WorkspaceFileSchema),
});

export const CreateWorkspaceResponseSchema = z.object({
  id: z.string().uuid(),
  expiresAt: z.number().int().positive(),
});

// ---- SSE event types ----

export type SSEEvent =
  | { type: "files_added"; files: WorkspaceFile[] }
  | { type: "workspace_expired" };
