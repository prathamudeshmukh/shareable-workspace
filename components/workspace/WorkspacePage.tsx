"use client";

import { useCallback, useEffect, useState } from "react";
import PartySocket from "partysocket";
import { FileDropZone } from "./FileDropZone";
import { FileGrid } from "./FileGrid";
import { SharePanel } from "./SharePanel";
import type { Workspace, WorkspaceFile, SSEEvent } from "@/types/workspace";

interface WorkspacePageProps {
  workspace: Workspace;
}

export function WorkspacePage({ workspace }: WorkspacePageProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>(workspace.files);

  const handleFileExpired = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // Connect to PartyKit room for real-time updates
  useEffect(() => {
    const partykitHost = process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999";

    const socket = new PartySocket({
      host: partykitHost,
      room: workspace.id,
    });

    socket.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as SSEEvent;

        if (event.type === "files_added") {
          setFiles((prev) => {
            const existingIds = new Set(prev.map((f) => f.id));
            const newFiles = event.files.filter((f) => !existingIds.has(f.id));
            return newFiles.length > 0 ? [...prev, ...newFiles] : prev;
          });
        }

        if (event.type === "file_expired") {
          setFiles((prev) => prev.filter((f) => f.id !== event.fileId));
        }
      } catch {
        // Malformed message — ignore
      }
    };

    return () => socket.close();
  }, [workspace.id]);

  const handleUploaded = useCallback((newFiles: unknown[]) => {
    // Upload route returns files immediately — PartyKit will also broadcast
    // to other tabs. Deduplicate by ID to avoid double-adding in the same tab.
    setFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.id));
      const typed = newFiles as WorkspaceFile[];
      const unique = typed.filter((f) => !existingIds.has(f.id));
      return unique.length > 0 ? [...prev, ...unique] : prev;
    });
  }, []);

  return (
    <>
      <SharePanel workspaceId={workspace.id} />

      <div className="mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-4 py-10">
        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-gray-100">Dropzone</h1>
            <p className="text-xs text-gray-500 font-mono">{workspace.id}</p>
          </div>
        </header>

        {/* Drop zone */}
        <FileDropZone
          workspaceId={workspace.id}
          onUploaded={handleUploaded}
          disabled={false}
        />

        {/* File grid */}
        {files.length > 0 && <FileGrid files={files} onFileExpired={handleFileExpired} />}

        {/* Empty state */}
        {files.length === 0 && (
          <p className="text-center text-sm text-gray-600">
            No files yet — upload something above.
          </p>
        )}
      </div>
    </>
  );
}
