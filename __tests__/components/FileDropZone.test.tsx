import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileDropZone } from "@/components/workspace/FileDropZone";

// Stub XMLHttpRequest used inside FileDropZone for uploads
class XhrStub {
  static instance: XhrStub;
  open = vi.fn();
  send = vi.fn();
  setRequestHeader = vi.fn();
  upload = { onprogress: null as unknown };
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  status = 201;
  responseText = JSON.stringify({ files: [] });

  constructor() {
    XhrStub.instance = this;
  }
}

beforeEach(() => {
  // Reset the shared instance so disabled-test assertions don't leak
  (XhrStub as { instance?: XhrStub }).instance = undefined as unknown as XhrStub;
  vi.stubGlobal("XMLHttpRequest", XhrStub);
});

function makeFile(name = "photo.jpg", type = "image/jpeg", size = 1024): File {
  return new File(["x".repeat(size)], name, { type });
}

describe("FileDropZone", () => {
  it("renders the drop zone text", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} />);
    expect(screen.getByText(/drop files or click to upload/i)).toBeInTheDocument();
  });

  it("changes text when dragging over", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;
    fireEvent.dragEnter(zone);
    expect(screen.getByText(/drop files here/i)).toBeInTheDocument();
  });

  it("resets drag text on drag leave", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;
    fireEvent.dragEnter(zone);
    fireEvent.dragLeave(zone);
    expect(screen.getByText(/drop files or click to upload/i)).toBeInTheDocument();
  });

  it("calls xhr.open with correct upload URL on drop", () => {
    render(<FileDropZone workspaceId="ws-42" onUploaded={vi.fn()} />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;

    fireEvent.drop(zone, {
      dataTransfer: { files: [makeFile()] },
    });

    expect(XhrStub.instance.open).toHaveBeenCalledWith(
      "POST",
      "/api/workspace/ws-42/upload"
    );
    expect(XhrStub.instance.send).toHaveBeenCalled();
  });

  it("shows error for too many files", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;
    const tooMany = Array.from({ length: 21 }, (_, i) => makeFile(`file${i}.jpg`));

    fireEvent.drop(zone, { dataTransfer: { files: tooMany } });

    expect(screen.getByText(/max 20 files/i)).toBeInTheDocument();
  });

  it("shows error for oversized file", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;
    // jsdom doesn't derive File.size from content, so override the property
    const bigFile = new File(["x"], "huge.mp4", { type: "video/mp4" });
    Object.defineProperty(bigFile, "size", { value: 60 * 1024 * 1024 });

    fireEvent.drop(zone, { dataTransfer: { files: [bigFile] } });

    expect(screen.getByText(/exceeds the 50 MB limit/i)).toBeInTheDocument();
  });

  it("does not upload when disabled", () => {
    render(<FileDropZone workspaceId="ws-1" onUploaded={vi.fn()} disabled />);
    const zone = screen.getByText(/drop files or click to upload/i).closest("div")!;

    fireEvent.drop(zone, { dataTransfer: { files: [makeFile()] } });

    // No XHR instance should have been created at all
    expect((XhrStub as { instance?: XhrStub }).instance).toBeUndefined();
  });
});
