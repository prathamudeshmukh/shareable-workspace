"use client";

import { useEffect, useState } from "react";

interface CountdownTimerProps {
  expiresAt: number; // epoch ms
  onExpired: () => void;
  compact?: boolean; // inline mode for file cards
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getColorClass(remainingMs: number): string {
  if (remainingMs <= 10_000) return "text-red-500 animate-pulse";
  if (remainingMs <= 60_000) return "text-amber-400";
  return "text-gray-400";
}

export function CountdownTimer({ expiresAt, onExpired, compact = false }: CountdownTimerProps) {
  const [remainingMs, setRemainingMs] = useState(() =>
    Math.max(0, expiresAt - Date.now())
  );

  useEffect(() => {
    const initial = Math.max(0, expiresAt - Date.now());
    if (initial <= 0) return;

    const interval = setInterval(() => {
      const next = Math.max(0, expiresAt - Date.now());
      setRemainingMs(next);
      if (next <= 0) {
        clearInterval(interval);
        onExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiresAt]);

  if (compact) {
    return (
      <span className={`font-mono text-xs tabular-nums transition-colors ${getColorClass(remainingMs)}`}>
        {formatTime(remainingMs)}
      </span>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs font-medium uppercase tracking-widest text-gray-500">
        Expires in
      </span>
      <span
        className={`font-mono text-4xl font-bold tabular-nums transition-colors ${getColorClass(remainingMs)}`}
      >
        {formatTime(remainingMs)}
      </span>
    </div>
  );
}
