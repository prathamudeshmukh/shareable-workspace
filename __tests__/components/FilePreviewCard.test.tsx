import { describe, it, expect } from "vitest";
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
    ...overrides,
  };
}

describe("FilePreviewCard", () => {
  it("renders an img tag for image MIME types", () => {
    render(<FilePreviewCard file={makeFile({ mimeType: "image/jpeg", name: "photo.jpg" })} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("renders a video element for video MIME types", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "video/mp4", name: "clip.mp4" })} />
    );
    expect(container.querySelector("video")).toBeInTheDocument();
  });

  it("renders an iframe for PDF MIME type", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "application/pdf", name: "doc.pdf" })} />
    );
    expect(container.querySelector("iframe")).toBeInTheDocument();
  });

  it("renders a generic file icon for unknown MIME types", () => {
    render(<FilePreviewCard file={makeFile({ mimeType: "application/zip", name: "archive.zip" })} />);
    expect(screen.getByText("ZIP")).toBeInTheDocument();
  });

  it("displays the filename", () => {
    render(<FilePreviewCard file={makeFile({ name: "my-document.pdf", mimeType: "application/pdf" })} />);
    expect(screen.getByText("my-document.pdf")).toBeInTheDocument();
  });

  it("displays formatted file size", () => {
    render(<FilePreviewCard file={makeFile({ size: 2048, mimeType: "image/png", name: "img.png" })} />);
    expect(screen.getByText("2.0 KB")).toBeInTheDocument();
  });

  it("renders a pre element for text MIME types", () => {
    const { container } = render(
      <FilePreviewCard file={makeFile({ mimeType: "text/plain", name: "notes.txt" })} />
    );
    expect(container.querySelector("pre")).toBeInTheDocument();
  });
});
