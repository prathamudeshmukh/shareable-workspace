"use client";

import { useRef, useState } from "react";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { MAX_FILE_SIZE_BYTES, MAX_FILES_PER_UPLOAD } from "@/lib/constants";

interface FileDropZoneProps {
  workspaceId: string;
  onUploaded: (files: unknown[]) => void;
  currentFileCount: number;
  maxFiles: number;
  disabled?: boolean;
}

export function FileDropZone({ workspaceId, onUploaded, currentFileCount, maxFiles, disabled = false }: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    setError(null);

    const remaining = maxFiles - currentFileCount;
    if (fileArray.length > remaining) {
      setError(remaining === 0 ? "Workspace is full." : `Only ${remaining} more file${remaining === 1 ? "" : "s"} allowed in this workspace.`);
      return;
    }
    if (fileArray.length > MAX_FILES_PER_UPLOAD) {
      setError(`Max ${MAX_FILES_PER_UPLOAD} files at once.`);
      return;
    }
    const oversized = fileArray.find((f) => f.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setError(`"${oversized.name}" exceeds the 50 MB limit.`);
      return;
    }

    const formData = new FormData();
    fileArray.forEach((f) => formData.append("files", f));

    setIsUploading(true);
    setProgress(0);

    // Use XHR for upload progress events (fetch doesn't expose them)
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/api/workspace/${workspaceId}/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      setProgress(0);
      if (xhr.status === 201) {
        const data = JSON.parse(xhr.responseText);
        onUploaded(data.files ?? []);
      } else {
        try {
          const data = JSON.parse(xhr.responseText);
          setError(data.error ?? "Upload failed.");
        } catch {
          setError("Upload failed.");
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setError("Network error — upload failed.");
    };

    xhr.send(formData);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!disabled && e.dataTransfer.files.length > 0) {
      upload(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      upload(e.target.files);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 transition-all",
          isDragging
            ? "border-violet-500 bg-violet-500/5"
            : "border-gray-700 hover:border-gray-600 hover:bg-gray-900/50",
          disabled || isUploading ? "cursor-not-allowed opacity-50" : "",
        ].join(" ")}
      >
        <UploadIcon isDragging={isDragging} />
        <div className="text-center">
          <p className="text-sm font-medium text-gray-300">
            {isDragging ? "Drop files here" : "Drop files or click to upload"}
          </p>
          <p className="mt-1 text-xs text-gray-600">
            {maxFiles - currentFileCount} of {maxFiles} slots available · 50 MB each
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleChange}
          disabled={disabled || isUploading}
        />
      </div>

      {isUploading && <ProgressBar progress={progress} />}
      {error && (
        <p className="text-center text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

function UploadIcon({ isDragging }: { isDragging: boolean }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke={isDragging ? "#7c3aed" : "#4b5563"}
      strokeWidth="1.5"
      className="transition-colors"
    >
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}
