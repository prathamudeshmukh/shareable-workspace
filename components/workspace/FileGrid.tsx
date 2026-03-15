import { FilePreviewCard } from "./FilePreviewCard";
import type { WorkspaceFile } from "@/types/workspace";

interface FileGridProps {
  files: WorkspaceFile[];
  onFileExpired: (fileId: string) => void;
}

export function FileGrid({ files, onFileExpired }: FileGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <FilePreviewCard key={file.id} file={file} onExpired={onFileExpired} />
      ))}
    </div>
  );
}
