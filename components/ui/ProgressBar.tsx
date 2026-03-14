interface ProgressBarProps {
  progress: number; // 0–100
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, progress));

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-gray-800">
      <div
        className="h-full rounded-full bg-violet-500 transition-all duration-200"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
