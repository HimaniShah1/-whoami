interface TerminalOutputProps {
  visibleLines: string[];
  progress: number;
  done: boolean;
  reducedMotion: boolean;
}

export default function TerminalOutput({
  visibleLines,
  progress,
  done,
  reducedMotion,
}: TerminalOutputProps) {
  const clampedProgress = Math.max(0, Math.min(100, Math.round(progress)));

  return (
    <div className="font-mono text-sm text-primary-muted">
      {visibleLines.map((line, index) => (
        <div key={index}>{line}</div>
      ))}
      {!done && (
        <span aria-hidden="true" className={reducedMotion ? '' : 'animate-pulse'}>
          _
        </span>
      )}
      <div className="mt-6">
        <div className="h-1 w-full bg-background-elevated">
          <div className="h-full bg-primary" style={{ width: `${clampedProgress}%` }} />
        </div>
        <div className="mt-1 text-xs text-primary">{clampedProgress}%</div>
      </div>
    </div>
  );
}
