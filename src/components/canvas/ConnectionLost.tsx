export default function ConnectionLost() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background font-mono text-primary-muted">
      <h1 className="text-lg text-status-error">CONNECTION LOST</h1>
      <p className="text-sm text-text-muted">The rendering context was lost.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded border border-primary px-4 py-2 text-sm text-primary hover:bg-primary/10"
      >
        Reload
      </button>
    </main>
  );
}
