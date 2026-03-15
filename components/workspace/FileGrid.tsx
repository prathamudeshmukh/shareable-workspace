"use client";

import { useEffect, useRef, useState } from "react";
import { FilePreviewCard } from "./FilePreviewCard";
import type { WorkspaceFile } from "@/types/workspace";

interface FileGridProps {
  files: WorkspaceFile[];
  onFileExpired: (fileId: string) => void;
}

export function FileGrid({ files, onFileExpired }: FileGridProps) {
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

  return (
    <div className="relative">
      <div ref={scrollRef} className="h-120 overflow-y-auto rounded-xl border border-white/5 p-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <FilePreviewCard key={file.id} file={file} onExpired={onFileExpired} />
          ))}
        </div>
      </div>

      {/* Bottom fade — visible only when there's more content below */}
      {hasMoreBelow && (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 rounded-b-xl bg-linear-to-t from-[#111827] to-transparent" />
      )}
    </div>
  );
}
