export type PreviewType = "image" | "video" | "pdf" | "text" | "unknown";

export function getPreviewType(mimeType: string): PreviewType {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "text";
  return "unknown";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/\.\./g, "")   // no path traversal
    .replace(/\//g, "")     // no slashes
    .replace(/\x00/g, "")   // no null bytes
    .trim();
  return sanitized || "file";
}

export function buildFileUrl(
  workspaceId: string,
  fileId: string,
  filename: string
): string {
  return `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/files/${workspaceId}/${fileId}/${sanitizeFilename(filename)}`;
}
