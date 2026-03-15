import type { R2Bucket } from "@cloudflare/workers-types";
import { WORKSPACE_DIR_PREFIX } from "@/lib/constants";

export async function putFile(
  bucket: R2Bucket,
  key: string,
  data: ArrayBuffer,
  contentType: string
): Promise<void> {
  await bucket.put(key, data, {
    httpMetadata: { contentType },
  });
}

// Returns the R2 object body stream, or null if the key doesn't exist.
// Typed as unknown to avoid conflicts between Cloudflare and global ReadableStream types.
export async function getFile(
  bucket: R2Bucket,
  key: string
): Promise<unknown> {
  const object = await bucket.get(key);
  if (!object) return null;
  return object.body;
}

export async function deleteFile(
  bucket: R2Bucket,
  r2Key: string
): Promise<void> {
  await bucket.delete(r2Key);
}

export async function deleteFileByPrefix(
  bucket: R2Bucket,
  workspaceId: string,
  fileId: string
): Promise<void> {
  const prefix = `${WORKSPACE_DIR_PREFIX}/${workspaceId}/${fileId}/`;
  const listed = await bucket.list({ prefix });

  if (listed.objects.length === 0) return;

  const keys = listed.objects.map((obj) => obj.key);
  await bucket.delete(keys);
}

export async function deleteWorkspaceFiles(
  bucket: R2Bucket,
  workspaceId: string
): Promise<void> {
  const prefix = `${WORKSPACE_DIR_PREFIX}/${workspaceId}/`;
  const listed = await bucket.list({ prefix });

  if (listed.objects.length === 0) return;

  const keys = listed.objects.map((obj) => obj.key);
  await bucket.delete(keys);
}

export function buildR2Key(
  workspaceId: string,
  fileId: string,
  filename: string
): string {
  return `${WORKSPACE_DIR_PREFIX}/${workspaceId}/${fileId}/${filename}`;
}
