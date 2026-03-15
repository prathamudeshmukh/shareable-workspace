import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { CountdownTimer } from "@/components/workspace/CountdownTimer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

const future = (ms: number) => Date.now() + ms;

describe("CountdownTimer", () => {
  it("renders MM:SS format correctly", () => {
    render(<CountdownTimer expiresAt={future(125_000)} onExpired={vi.fn()} />);
    expect(screen.getByText("02:05")).toBeInTheDocument();
  });

  it("counts down each second", () => {
    render(<CountdownTimer expiresAt={future(10_000)} onExpired={vi.fn()} />);
    expect(screen.getByText("00:10")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText("00:07")).toBeInTheDocument();
  });

  it("calls onExpired when countdown reaches zero", () => {
    const onExpired = vi.fn();
    render(<CountdownTimer expiresAt={future(2000)} onExpired={onExpired} />);
    act(() => vi.advanceTimersByTime(3000));
    expect(onExpired).toHaveBeenCalledTimes(1);
  });

  it("shows red + pulse class below 10 seconds", () => {
    render(<CountdownTimer expiresAt={future(5000)} onExpired={vi.fn()} />);
    const el = screen.getByText("00:05");
    expect(el.className).toContain("text-red-500");
    expect(el.className).toContain("animate-pulse");
  });

  it("shows amber class between 10 and 60 seconds", () => {
    render(<CountdownTimer expiresAt={future(30_000)} onExpired={vi.fn()} />);
    const el = screen.getByText("00:30");
    expect(el.className).toContain("text-amber-400");
  });

  it("shows default color above 60 seconds", () => {
    render(<CountdownTimer expiresAt={future(120_000)} onExpired={vi.fn()} />);
    const el = screen.getByText("02:00");
    expect(el.className).toContain("text-gray-400");
  });

  it("shows 00:00 for already-expired timestamp", () => {
    render(<CountdownTimer expiresAt={Date.now() - 1000} onExpired={vi.fn()} />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });
});
