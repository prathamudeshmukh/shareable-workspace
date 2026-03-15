"use client";

import { useEffect, useRef, useState } from "react";

interface SharePanelProps {
  workspaceId: string;
}

export function SharePanel({ workspaceId }: SharePanelProps) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (!showQr) return;
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowQr(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showQr]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQr = async () => {
    if (showQr) {
      setShowQr(false);
      return;
    }
    if (!qrDataUrl) {
      const qr = await import("qrcode");
      const dataUrl = await qr.toDataURL(url, {
        width: 180,
        margin: 2,
        color: { dark: "#f9fafb", light: "#111827" },
      });
      setQrDataUrl(dataUrl);
    }
    setShowQr(true);
  };

  return (
    <div ref={toolbarRef} className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="flex items-center gap-1 rounded-full border border-gray-700 bg-gray-900/80 px-2 py-1.5 backdrop-blur-sm">
        <button
          onClick={handleCopy}
          title="Copy link"
          aria-label="Copy workspace link"
          className="flex h-7 w-7 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-800 hover:text-gray-100"
        >
          {copied ? <CheckIcon /> : <LinkIcon />}
        </button>

        <div className="h-4 w-px bg-gray-700" />

        <button
          onClick={handleQr}
          title="Show QR code"
          aria-label="Show QR code"
          className={`flex h-7 w-7 items-center justify-center rounded-full transition-colors ${
            showQr ? "bg-gray-700 text-gray-100" : "text-gray-400 hover:bg-gray-800 hover:text-gray-100"
          }`}
        >
          <QrIcon />
        </button>
      </div>

      {showQr && qrDataUrl && (
        <div className="absolute right-0 top-full mt-2 rounded-xl border border-gray-700 bg-gray-900 p-3 shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code for workspace ${workspaceId}`}
            width={180}
            height={180}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function QrIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <line x1="14" y1="14" x2="14" y2="14" strokeWidth="3" />
      <line x1="20" y1="14" x2="20" y2="14" strokeWidth="3" />
      <line x1="14" y1="20" x2="20" y2="20" strokeWidth="2" />
      <line x1="20" y1="17" x2="20" y2="20" strokeWidth="2" />
    </svg>
  );
}
