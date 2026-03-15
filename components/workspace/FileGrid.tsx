"use client";

import { useEffect, useRef, useState } from "react";
import { FilePreviewCard } from "./FilePreviewCard";
import type { WorkspaceFile } from "@/types/workspace";

interface FileGridProps {
  files: WorkspaceFile[];
  maxFiles: number;
  onFileExpired: (fileId: string) => void;
  onFileDeleted: (fileId: string) => void;
}

export function FileGrid({ files, maxFiles, onFileExpired, onFileDeleted }: FileGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const check = () => setHasMoreBelow(el.scrollTop + el.clientHeight < el.scrollHeight - 4);

    check();
    el.addEventListener("scroll", check);
    const ro = new ResizeObserver(check);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", check);
      ro.disconnect();
    };
  }, [files]);

  if (files.length === 0) return null;

  const remaining = maxFiles - files.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{files.length} {files.length === 1 ? "file" : "files"} uploaded</span>
        {remaining === 0
          ? <span className="text-amber-500">Workspace full</span>
          : <span>{remaining} more allowed</span>
        }
      </div>
    <div className="relative">
      <div ref={scrollRef} className="h-72 overflow-y-auto rounded-xl border border-white/5 p-3 sm:h-120">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {[...files].sort((a, b) => b.uploadedAt - a.uploadedAt).map((file) => (
            <FilePreviewCard key={file.id} file={file} onExpired={onFileExpired} onDelete={onFileDeleted} />
          ))}
        </div>
      </div>

      {/* Bottom fade — visible only when there's more content below */}
      {hasMoreBelow && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-xl bg-linear-to-t from-[#111827] to-transparent" />
      )}
    </div>
    </div>
  );
}
