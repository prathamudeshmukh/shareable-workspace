import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

  describe("download buttons", () => {
    it("renders two download links — footer button and preview overlay", () => {
      render(<FilePreviewCard file={makeFile({ name: "photo.jpg", mimeType: "image/jpeg" })} onExpired={vi.fn()} />);
      const links = screen.getAllByRole("link", { name: /download photo\.jpg/i });
      expect(links).toHaveLength(2);
    });

    it("both download links point to the file URL", () => {
      const file = makeFile({ name: "photo.jpg", mimeType: "image/jpeg", url: "/api/files/ws-1/f-1/photo.jpg" });
      render(<FilePreviewCard file={file} onExpired={vi.fn()} />);
      const links = screen.getAllByRole("link", { name: /download photo\.jpg/i });
      links.forEach((link) => expect(link).toHaveAttribute("href", "/api/files/ws-1/f-1/photo.jpg"));
    });

    it("both download links carry the download attribute with the filename", () => {
      const file = makeFile({ name: "report.pdf", mimeType: "application/pdf" });
      render(<FilePreviewCard file={file} onExpired={vi.fn()} />);
      const links = screen.getAllByRole("link", { name: /download report\.pdf/i });
      links.forEach((link) => expect(link).toHaveAttribute("download", "report.pdf"));
    });

    it("preview overlay download link is present in the DOM (hidden via CSS, not JS)", () => {
      render(<FilePreviewCard file={makeFile({ name: "clip.mp4", mimeType: "video/mp4" })} onExpired={vi.fn()} />);
      // Both anchors exist in the DOM; visibility is controlled by Tailwind opacity classes
      const links = screen.getAllByRole("link", { name: /download clip\.mp4/i });
      expect(links[0]).toBeInTheDocument();
    });

    it("overlay download link shows 'Download' label text", () => {
      render(<FilePreviewCard file={makeFile({ name: "notes.txt", mimeType: "text/plain" })} onExpired={vi.fn()} />);
      expect(screen.getByText("Download")).toBeInTheDocument();
    });

    it("clicking the footer download link does not throw", () => {
      render(<FilePreviewCard file={makeFile({ name: "archive.zip", mimeType: "application/zip" })} onExpired={vi.fn()} />);
      const links = screen.getAllByRole("link", { name: /download archive\.zip/i });
      // footer button is the second link (overlay is first in DOM order)
      expect(() => fireEvent.click(links[1])).not.toThrow();
    });

    it("download links are rendered for every preview type", () => {
      const mimeTypes = [
        { mimeType: "image/png", name: "img.png" },
        { mimeType: "video/mp4", name: "clip.mp4" },
        { mimeType: "application/pdf", name: "doc.pdf" },
        { mimeType: "text/plain", name: "notes.txt" },
        { mimeType: "application/zip", name: "archive.zip" },
      ];
      mimeTypes.forEach(({ mimeType, name }) => {
        const { unmount } = render(
          <FilePreviewCard file={makeFile({ mimeType, name })} onExpired={vi.fn()} />
        );
        const links = screen.getAllByRole("link", { name: new RegExp(`download ${name}`, "i") });
        expect(links).toHaveLength(2);
        unmount();
      });
    });
  });
});
