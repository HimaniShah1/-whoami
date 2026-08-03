interface TerminalPanelProps {
  title: string;
  visibleLines: string[];
  done: boolean;
  reducedMotion: boolean;
}

export default function TerminalPanel({ title, visibleLines, done, reducedMotion }: TerminalPanelProps) {
  return (
    <div className="w-full max-w-xl max-h-[60vh] overflow-y-auto rounded border border-primary/30 bg-background-elevated p-3 font-mono text-xs text-primary-muted">
      <div className="mb-2 text-primary">{title}</div>
      {visibleLines.map((line, index) => (
        <div key={index}>{line || ' '}</div>
      ))}
      {!done && (
        <span aria-hidden="true" className={reducedMotion ? '' : 'animate-pulse'}>
          _
        </span>
      )}
    </div>
  );
}
