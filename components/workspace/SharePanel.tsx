"use client";

import { useEffect, useState } from "react";
import { CopyButton } from "@/components/ui/CopyButton";

interface SharePanelProps {
  workspaceId: string;
}

export function SharePanel({ workspaceId }: SharePanelProps) {
  const [url, setUrl] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const handleShowQr = async () => {
    if (qrDataUrl) {
      setShowQr((v) => !v);
      return;
    }
    // Dynamically import qrcode to keep it out of the initial bundle
    const qr = await import("qrcode");
    const dataUrl = await qr.toDataURL(window.location.href, {
      width: 200,
      margin: 2,
      color: { dark: "#f9fafb", light: "#111827" },
    });
    setQrDataUrl(dataUrl);
    setShowQr(true);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-medium uppercase tracking-widest text-gray-500">
        Share this workspace
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={url}
          className="flex-1 truncate rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-sm text-gray-300 outline-none"
        />
        <CopyButton text={url} />
      </div>

      <button
        onClick={handleShowQr}
        className="flex items-center justify-center gap-2 rounded-lg border border-gray-700 py-2 text-sm text-gray-400 transition-colors hover:border-gray-600 hover:text-gray-200"
      >
        <QrIcon />
        {showQr ? "Hide QR code" : "Show QR code"}
      </button>

      {showQr && qrDataUrl && (
        <div className="flex justify-center pt-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code for workspace ${workspaceId}`}
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
      )}
    </div>
  );
}

function QrIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
