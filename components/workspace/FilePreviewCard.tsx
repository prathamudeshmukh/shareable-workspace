"use client";

import { useEffect, useState } from "react";
import { getPreviewType, formatFileSize } from "@/lib/file-utils";
import { CountdownTimer } from "./CountdownTimer";
import type { WorkspaceFile } from "@/types/workspace";

interface FilePreviewCardProps {
  file: WorkspaceFile;
  onExpired: (fileId: string) => void;
}

export function FilePreviewCard({ file, onExpired }: FilePreviewCardProps) {
  const previewType = getPreviewType(file.mimeType);

  return (
    <div className="group flex animate-fade-in flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gray-950">
        <Preview file={file} type={previewType} />
        <a
          href={file.url}
          download={file.name}
          className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
          aria-label={`Download ${file.name}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col items-center gap-1.5 text-white">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span className="text-xs font-medium">Download</span>
          </div>
        </a>
      </div>
      <ExpiryProgressBar uploadedAt={file.uploadedAt} expiresAt={file.expiresAt} />
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium text-gray-100" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
          <div className="flex items-center gap-2">
            <a
              href={file.url}
              download={file.name}
              className="rounded p-1 text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
              title="Download"
              aria-label={`Download ${file.name}`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </a>
            <CountdownTimer
              compact
              expiresAt={file.expiresAt}
              onExpired={() => onExpired(file.id)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Preview({ file, type }: { file: WorkspaceFile; type: ReturnType<typeof getPreviewType> }) {
  if (type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file.url}
        alt={file.name}
        className="h-full w-full object-cover"
      />
    );
  }

  if (type === "video") {
    return (
      <video
        src={file.url}
        controls
        className="h-full w-full object-contain"
        preload="metadata"
      />
    );
  }

  if (type === "pdf") {
    return (
      <iframe
        src={file.url}
        title={file.name}
        className="h-full w-full border-0"
      />
    );
  }

  if (type === "text") {
    return <TextPreview url={file.url} />;
  }

  return <FileIcon mimeType={file.mimeType} />;
}

function TextPreview({ url }: { url: string }) {
  const [content, setContent] = useState<string>("");

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then((text) => setContent(text.slice(0, 2000)))
      .catch(() => setContent("(unable to load preview)"));
  }, [url]);

  return (
    <pre className="h-full w-full overflow-hidden p-3 text-left text-xs text-gray-400">
      {content || "Loading…"}
    </pre>
  );
}

function ExpiryProgressBar({ uploadedAt, expiresAt }: { uploadedAt: number; expiresAt: number }) {
  const totalMs = expiresAt - uploadedAt;
  const [remainingMs, setRemainingMs] = useState<number | null>(null);

  useEffect(() => {
    const initial = Math.max(0, expiresAt - Date.now());
    setRemainingMs(initial);
    if (initial <= 0) return;

    const interval = setInterval(() => {
      const next = Math.max(0, expiresAt - Date.now());
      setRemainingMs(next);
      if (next <= 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const pct = remainingMs === null ? 100 : totalMs > 0 ? (remainingMs / totalMs) * 100 : 0;
  const colorClass =
    remainingMs !== null && remainingMs <= 10_000 ? "bg-red-900" :
    remainingMs !== null && remainingMs <= 60_000 ? "bg-amber-900" :
    "bg-gray-700";

  return (
    <div className="h-1 w-full bg-gray-800">
      <div
        className={`h-full transition-[width] duration-1000 ease-linear ${colorClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  const ext = mimeType.split("/")[1]?.split("+")[0]?.toUpperCase() ?? "FILE";
  return (
    <div className="flex flex-col items-center gap-2 text-gray-600">
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <span className="text-xs font-mono font-bold text-gray-500">{ext}</span>
    </div>
  );
}
