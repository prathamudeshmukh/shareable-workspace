import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { SharePanel } from "@/components/workspace/SharePanel";

const writeText = vi.fn().mockResolvedValue(undefined);
Object.defineProperty(navigator, "clipboard", {
  value: { writeText },
  configurable: true,
});

Object.defineProperty(window, "location", {
  value: { href: "https://example.com/workspace/ws/test-123" },
  configurable: true,
});

vi.mock("qrcode", () => ({
  toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,fakeqr"),
}));

describe("SharePanel toolbar", () => {
  beforeEach(() => {
    writeText.mockClear();
  });

  it("renders the copy link and QR code buttons", () => {
    render(<SharePanel workspaceId="test-123" />);
    expect(screen.getByRole("button", { name: /copy workspace link/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show qr code/i })).toBeInTheDocument();
  });

  it("does not render the old 'Share this workspace' heading", () => {
    render(<SharePanel workspaceId="test-123" />);
    expect(screen.queryByText(/share this workspace/i)).not.toBeInTheDocument();
  });

  it("does not render a URL input field", () => {
    render(<SharePanel workspaceId="test-123" />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("copies the current URL when copy button is clicked", async () => {
    render(<SharePanel workspaceId="test-123" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /copy workspace link/i }));
    });
    expect(writeText).toHaveBeenCalledWith("https://example.com/workspace/ws/test-123");
  });

  it("does not copy when URL is not yet set", () => {
    // clipboard.writeText is only called after the effect sets the URL
    render(<SharePanel workspaceId="test-123" />);
    expect(writeText).not.toHaveBeenCalled();
  });

  it("does not show QR image initially", () => {
    render(<SharePanel workspaceId="test-123" />);
    expect(screen.queryByRole("img", { name: /qr code/i })).not.toBeInTheDocument();
  });

  it("shows QR image after clicking the QR button", async () => {
    render(<SharePanel workspaceId="test-123" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /show qr code/i }));
    });
    expect(screen.getByRole("img", { name: /qr code for workspace test-123/i })).toBeInTheDocument();
  });

  it("QR image uses the generated data URL as src", async () => {
    render(<SharePanel workspaceId="test-123" />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /show qr code/i }));
    });
    const img = screen.getByRole("img", { name: /qr code/i });
    expect(img).toHaveAttribute("src", "data:image/png;base64,fakeqr");
  });

  it("hides QR image when QR button is clicked again", async () => {
    render(<SharePanel workspaceId="test-123" />);
    const qrBtn = screen.getByRole("button", { name: /show qr code/i });
    await act(async () => {
      fireEvent.click(qrBtn);
    });
    expect(screen.getByRole("img", { name: /qr code/i })).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(qrBtn);
    });
    expect(screen.queryByRole("img", { name: /qr code/i })).not.toBeInTheDocument();
  });

  it("hides QR image when clicking outside the toolbar", async () => {
    render(
      <div>
        <SharePanel workspaceId="test-123" />
        <div data-testid="outside">outside</div>
      </div>
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /show qr code/i }));
    });
    expect(screen.getByRole("img", { name: /qr code/i })).toBeInTheDocument();
    await act(async () => {
      fireEvent.mouseDown(screen.getByTestId("outside"));
    });
    expect(screen.queryByRole("img", { name: /qr code/i })).not.toBeInTheDocument();
  });

  it("toolbar has fixed positioning class", () => {
    const { container } = render(<SharePanel workspaceId="test-123" />);
    const toolbar = container.firstChild as HTMLElement;
    expect(toolbar.className).toMatch(/fixed/);
  });
});
