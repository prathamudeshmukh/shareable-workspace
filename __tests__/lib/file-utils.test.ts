import { describe, it, expect } from "vitest";
import { getPreviewType, formatFileSize, sanitizeFilename, buildFileUrl } from "@/lib/file-utils";

describe("getPreviewType", () => {
  it("returns image for image/* MIME types", () => {
    expect(getPreviewType("image/jpeg")).toBe("image");
    expect(getPreviewType("image/png")).toBe("image");
    expect(getPreviewType("image/gif")).toBe("image");
    expect(getPreviewType("image/webp")).toBe("image");
  });

  it("returns video for video/* MIME types", () => {
    expect(getPreviewType("video/mp4")).toBe("video");
    expect(getPreviewType("video/webm")).toBe("video");
  });

  it("returns pdf for application/pdf", () => {
    expect(getPreviewType("application/pdf")).toBe("pdf");
  });

  it("returns text for text/* MIME types", () => {
    expect(getPreviewType("text/plain")).toBe("text");
    expect(getPreviewType("text/html")).toBe("text");
    expect(getPreviewType("text/css")).toBe("text");
  });

  it("returns unknown for unrecognized MIME types", () => {
    expect(getPreviewType("application/zip")).toBe("unknown");
    expect(getPreviewType("application/octet-stream")).toBe("unknown");
    expect(getPreviewType("")).toBe("unknown");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
    expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB");
  });

  it("formats zero bytes", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
});

describe("sanitizeFilename", () => {
  it("strips path traversal sequences", () => {
    expect(sanitizeFilename("../../../etc/passwd")).not.toContain("..");
    expect(sanitizeFilename("../../secret")).not.toContain("..");
  });

  it("strips forward slashes", () => {
    expect(sanitizeFilename("foo/bar/baz.txt")).not.toContain("/");
  });

  it("strips null bytes", () => {
    expect(sanitizeFilename("file\x00name.txt")).not.toContain("\x00");
  });

  it("preserves normal filenames", () => {
    expect(sanitizeFilename("my-document.pdf")).toBe("my-document.pdf");
    expect(sanitizeFilename("photo 2024.jpg")).toBe("photo 2024.jpg");
  });

  it("returns fallback for empty result", () => {
    expect(sanitizeFilename("///")).toBe("file");
    expect(sanitizeFilename("")).toBe("file");
  });
});

describe("buildFileUrl", () => {
  it("builds a correct file URL", () => {
    const url = buildFileUrl("ws-123", "file-456", "photo.jpg");
    expect(url).toBe("/api/files/ws-123/file-456/photo.jpg");
  });

  it("uses sanitized filename in URL", () => {
    const url = buildFileUrl("ws-1", "f-1", "../secret.txt");
    expect(url).not.toContain("..");
  });
});
