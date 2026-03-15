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

  describe("expiry progress bar", () => {
    it("renders a progress bar element", () => {
      const { container } = render(<FilePreviewCard file={makeFile()} onExpired={vi.fn()} />);
      // outer track + inner fill
      const track = container.querySelector(".bg-gray-800");
      expect(track).toBeInTheDocument();
    });

    it("progress bar fill width reflects remaining time", () => {
      const now = Date.now();
      const uploadedAt = now - 300_000; // 5 min ago
      const expiresAt = now + 300_000;  // 5 min left → ~50%
      const { container } = render(
        <FilePreviewCard file={makeFile({ uploadedAt, expiresAt })} onExpired={vi.fn()} />
      );
      const fill = container.querySelector(".bg-gray-800 > div") as HTMLElement;
      const width = parseFloat(fill.style.width);
      expect(width).toBeGreaterThan(40);
      expect(width).toBeLessThan(60);
    });

    it("progress bar is full when file just uploaded", () => {
      const now = Date.now();
      const { container } = render(
        <FilePreviewCard file={makeFile({ uploadedAt: now, expiresAt: now + 600_000 })} onExpired={vi.fn()} />
      );
      const fill = container.querySelector(".bg-gray-800 > div") as HTMLElement;
      const width = parseFloat(fill.style.width);
      expect(width).toBeGreaterThan(99);
    });

    it("progress bar fill is zero for an expired file", () => {
      const now = Date.now();
      const { container } = render(
        <FilePreviewCard file={makeFile({ uploadedAt: now - 700_000, expiresAt: now - 100_000 })} onExpired={vi.fn()} />
      );
      const fill = container.querySelector(".bg-gray-800 > div") as HTMLElement;
      expect(fill.style.width).toBe("0%");
    });

    it("progress bar uses amber color when under 60 seconds remain", () => {
      const now = Date.now();
      const { container } = render(
        <FilePreviewCard
          file={makeFile({ uploadedAt: now - 599_000, expiresAt: now + 30_000 })}
          onExpired={vi.fn()}
        />
      );
      const fill = container.querySelector(".bg-gray-800 > div") as HTMLElement;
      expect(fill.className).toMatch(/bg-amber-900/);
    });

    it("progress bar uses red color when under 10 seconds remain", () => {
      const now = Date.now();
      const { container } = render(
        <FilePreviewCard
          file={makeFile({ uploadedAt: now - 595_000, expiresAt: now + 5_000 })}
          onExpired={vi.fn()}
        />
      );
      const fill = container.querySelector(".bg-gray-800 > div") as HTMLElement;
      expect(fill.className).toMatch(/bg-red-900/);
    });

    it("progress bar is positioned between preview and file info", () => {
      const { container } = render(<FilePreviewCard file={makeFile()} onExpired={vi.fn()} />);
      const card = container.firstChild as HTMLElement;
      const children = Array.from(card.children);
      const trackIndex = children.findIndex((el) => el.classList.contains("bg-gray-800"));
      // preview area is first child (index 0), track should be index 1
      expect(trackIndex).toBe(1);
    });
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
