"use client";

import Link from "next/link";

export function ExpiredOverlay() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/95 backdrop-blur-sm">
      <div className="flex max-w-sm flex-col items-center gap-6 px-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-900 text-gray-500">
          <ClockIcon />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold text-gray-100">
            Workspace Expired
          </h2>
          <p className="text-sm text-gray-400">
            All files have been permanently deleted. Create a new workspace to
            start fresh.
          </p>
        </div>
        <Link
          href="/"
          className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-violet-500"
        >
          New Workspace
        </Link>
      </div>
    </div>
  );
}

function ClockIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
