export default function ConnectionLost() {
  return (
    <main className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[#0a0e14] font-mono text-[#e6f7ff]">
      <h1 className="text-lg text-[#ff5f56]">CONNECTION LOST</h1>
      <p className="text-sm text-[#8fa3b8]">The rendering context was lost.</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded border border-[#4fd1ff] px-4 py-2 text-sm text-[#4fd1ff] hover:bg-[#4fd1ff]/10"
      >
        Reload
      </button>
    </main>
  );
}
