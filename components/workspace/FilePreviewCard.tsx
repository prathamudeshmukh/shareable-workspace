"use client";

import { useEffect, useRef, useState } from "react";
import { getPreviewType, formatFileSize } from "@/lib/file-utils";
import { CountdownTimer } from "./CountdownTimer";
import type { WorkspaceFile } from "@/types/workspace";

interface FilePreviewCardProps {
  file: WorkspaceFile;
  onExpired: (fileId: string) => void;
  onDelete: (fileId: string) => void;
}

const MOBILE_TIMER_VISIBLE_MS = 3000;

export function FilePreviewCard({ file, onExpired, onDelete }: FilePreviewCardProps) {
  const previewType = getPreviewType(file.mimeType);
  const [actionsVisible, setTimerTouched] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const touchHideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTouch = () => {
    if (touchHideTimeout.current) clearTimeout(touchHideTimeout.current);
    setTimerTouched(true);
    touchHideTimeout.current = setTimeout(() => setTimerTouched(false), MOBILE_TIMER_VISIBLE_MS);
  };

  useEffect(() => () => {
    if (touchHideTimeout.current) clearTimeout(touchHideTimeout.current);
  }, []);

  return (
    <>
      <div
        className="group flex animate-fade-in cursor-pointer flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900"
        onTouchStart={handleTouch}
      >
        <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gray-950 sm:h-44">
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
            <div className="flex items-center gap-1">
              <div
                className={`transition-opacity duration-200 ${actionsVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
              >
                <CountdownTimer
                  compact
                  expiresAt={file.expiresAt}
                  onExpired={() => onExpired(file.id)}
                />
              </div>
              <button
                onClick={() => setConfirmOpen(true)}
                className="rounded p-1 text-gray-600 transition-colors hover:bg-gray-800 hover:text-red-400"
                title="Delete"
                aria-label={`Delete ${file.name}`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {confirmOpen && (
        <DeleteDialog
          fileName={file.name}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => { setConfirmOpen(false); onDelete(file.id); }}
        />
      )}
    </>
  );
}

interface DeleteDialogProps {
  fileName: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteDialog({ fileName, onCancel, onConfirm }: DeleteDialogProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-700 bg-gray-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-medium text-gray-100">Delete file?</p>
        <p className="mt-1 truncate text-xs text-gray-400" title={fileName}>{fileName}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
          >
            Delete
          </button>
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
    remainingMs !== null && remainingMs <= 10_000 ? "bg-rose-500 shadow-[0_0_6px_theme(colors.rose.500)]" :
    remainingMs !== null && remainingMs <= 60_000 ? "bg-orange-500" :
    "bg-violet-500";

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
