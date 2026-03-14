import { FilePreviewCard } from "./FilePreviewCard";
import type { WorkspaceFile } from "@/types/workspace";

interface FileGridProps {
  files: WorkspaceFile[];
}

export function FileGrid({ files }: FileGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {files.map((file) => (
        <FilePreviewCard key={file.id} file={file} />
      ))}
    </div>
  );
}
