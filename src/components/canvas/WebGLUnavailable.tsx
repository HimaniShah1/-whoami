export default function WebGLUnavailable() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-8 text-center font-mono text-primary-muted">
      <h1 className="text-lg">503 — this browser can&apos;t render the backend</h1>
      <p className="max-w-md text-sm text-text-muted">
        This experience requires WebGL support. Reach me directly instead:
      </p>
      <a className="text-sm underline" href="mailto:himanishah@solvative.com">
        himanishah@solvative.com
      </a>
    </main>
  );
}
