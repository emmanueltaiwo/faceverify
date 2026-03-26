import FaceVerifyApp from "@/components/FaceVerifyApp";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Dot grid */}
      <div className="dot-grid pointer-events-none absolute inset-0 opacity-60" aria-hidden />

      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(6,182,212,0.08) 0%, transparent 70%)",
        }}
        aria-hidden
      />

      {/* Corner decorations */}
      <div className="pointer-events-none absolute left-4 top-4 h-8 w-8 border-l border-t border-cyan-500/20" aria-hidden />
      <div className="pointer-events-none absolute right-4 top-4 h-8 w-8 border-r border-t border-cyan-500/20" aria-hidden />
      <div className="pointer-events-none absolute bottom-4 left-4 h-8 w-8 border-b border-l border-cyan-500/20" aria-hidden />
      <div className="pointer-events-none absolute bottom-4 right-4 h-8 w-8 border-b border-r border-cyan-500/20" aria-hidden />

      <main className="relative z-10 mx-auto w-full max-w-lg flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <FaceVerifyApp />
      </main>
    </div>
  );
}
