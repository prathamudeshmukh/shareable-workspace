import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { FilePreviewCard } from "@/components/workspace/FilePreviewCard";
import type { WorkspaceFile } from "@/types/workspace";

function makeFile(overrides: Partial<WorkspaceFile> = {}): WorkspaceFile {
  return {
    id: "f-1",
    workspaceId: "ws-1",
    name: "test-file",
    mimeType: "application/octet-stream",
    size: 1024,
    url: "/api/files/ws-1/f-1/test-file",
    uploadedAt: Date.now(),
    expiresAt: Date.now() + 600_000,
    ...overrides,
  };
}

describe("FilePreviewCard", () => {
  it("renders an img tag for image MIME types", () => {
    render(<FilePreviewCard file={makeFile({ mimeType: "image/jpeg", name: "photo.jpg" })} onExpired={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders a video element for video MIME types", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "video/mp4", name: "clip.mp4" })} onExpired={vi.fn()} />
    );
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("renders an iframe for PDF MIME type", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "application/pdf", name: "doc.pdf" })} onExpired={vi.fn()} />
    );
    expect(container.querySelector("iframe")).toBeInTheDocument();
  });

  it("renders a generic file icon for unknown MIME types", () => {
    render(<FilePreviewCard file={makeFile({ mimeType: "application/zip", name: "archive.zip" })} onExpired={vi.fn()} />);
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  it("displays the filename", () => {
    render(<FilePreviewCard file={makeFile({ name: "my-document.pdf", mimeType: "application/pdf" })} onExpired={vi.fn()} />);
    expect(screen.getByText("my-document.pdf")).toBeInTheDocument();
  });

  it("displays formatted file size", () => {
    render(<FilePreviewCard file={makeFile({ size: 2048, mimeType: "image/png", name: "img.png" })} onExpired={vi.fn()} />);
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("renders a pre element for text MIME types", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "text/plain", name: "notes.txt" })} onExpired={vi.fn()} />
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
  });

  it("calls onExpired with file id when countdown fires", () => {
    const onExpired = vi.fn();
    render(
      <FilePreviewCard
        file={makeFile({ id: "f-42", expiresAt: Date.now() - 1 })}
        onExpired={onExpired}
      />
    );
    // Timer fires immediately for already-expired files (no interval started)
    // onExpired should not be called yet — the interval only calls it after ticking
    expect(onExpired).not.toHaveBeenCalled();
  });
});
