"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import packageJson from "../../../package.json";

// Dark-mode variant of the Pyrana mark. Fills tuned for cream-on-ink:
// cream strokes, transparent where the source art has its cream cutouts,
// orange accent preserved.
function PyranaMark({ className = "" }: { className?: string }) {
  const cream = "var(--cream)";
  const ink = "var(--ink)";
  const orange = "var(--brand-orange)";
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="2 5 118 88"
      className={className}
      aria-hidden
    >
      <path
        fill={cream}
        d="m118.7 45.9-9.3-5.3c-4.5-2.4-13.2-7.3-18.8-10.1-5.2-2.7-13.7-6.6-22.7-10.5-3.4-4.4-8.3-9.2-12.5-11.9-4.1-2.7-9.4-6.1-17.3-6.7h-5.1v9.6h7.3v11c-6.9 3-12.3 6.3-19.2 14.1-2.4-5.5-6.9-11.5-15.2-11.5h-4.4v9.8h7.1v27.8h-7.1v10.1h4.4c6.9 0 14-3.7 15.6-12.3h6.4c1.3 1.2 2.7 3 3.8 3.9-1 4.3-4.9 9.8-9.2 14.2h2.9c4.7 0 10.5-1.4 15.9-5.7 2.6 1.8 5.3 3.6 8.4 5.3v6.6h-9.4v9.6h5.7c9.9 0 17.6-3.4 25.5-10.2 2.9 0.3 6.1 0.5 10.5 0.5 7.9 0 16.6-0.6 27.5-3.7l3.4-17-9.7 12.6 1.6-12.6-8.6 10.4-0.6-0.3 0.5-10.3-6.1 6.8-1.1-0.9-0.2-7-3.9 3.7-3.5-2.6c2.8-2.6 5.9-4.7 10.3-6.5l0.9 5.9 7.1-8.7 0.8 9.3 7.6-11.7 0.6 12.2 10.1-17.9z"
      />
      <path
        fill={ink}
        d="m18.6 47.5v3.1c3.2 0.1 8.6 0.4 14.1 1.7 4.2 6.6 11 12.6 17 16.1 6.8 4 15 7.9 27.5 7.9 3.3 0 6.5-0.2 10.4-0.7l-14.5-12.3c6.4-7.1 15.8-14.1 28.8-17.9-7.3-5.5-20.6-14.6-34.5-18.8-2.8-0.8-5.6-1.6-8.6-1.6-4.7 0-9.7 1.3-14.5 3.6-7.4 3.5-13.7 8.6-25.7 18.9z"
      />
      <path fill={cream} d="m82 38.3-22.1-7.2 27.1 12.9 3.6-1.1-8.6-4.6z" />
      <path fill={orange} d="m59.9 31.1 13.6 8.2 1.9 3.9 5 3 6.6-2.2-27.1-12.9z" />
      <path fill={cream} d="m41.5 38.4v19.5l5.2-3.1v-19.5l-5.2 3.1z" />
      <path fill={cream} d="m50.1 38.3v23.7l5.5-3v-20.7h-5.5z" />
      <path fill={cream} d="m59 44.5v20.1l5.7-2.8v-17.3h-5.7z" />
    </svg>
  );
}

function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  return (
    <main className="min-h-screen bg-ink text-cream flex items-center justify-center p-6">
      <div
        className="relative w-full max-w-5xl border-2 border-ink shadow-brut-lg p-10 md:p-12 grid md:grid-cols-[1.5fr_1fr] gap-10 bg-ink overflow-hidden"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, transparent 0 40px, rgba(239,232,216,0.06) 40px 41px), repeating-linear-gradient(0deg, transparent 0 40px, rgba(239,232,216,0.06) 40px 41px)",
        }}
      >
        <div
          aria-hidden
          className="absolute -right-16 -bottom-20 pointer-events-none"
          style={{ opacity: 0.14 }}
        >
          <PyranaMark className="h-[420px] w-[520px] block" />
        </div>

        <div className="relative z-10">
          <div className="font-mono text-[10px] tracking-[0.22em] opacity-65">
            PYRANA · INTERNAL TOOL · NO MARKETING
          </div>
          <h1
            className="font-display leading-[0.85] tracking-[-0.055em] mt-4 mb-5"
            style={{ fontSize: "clamp(56px, 8vw, 112px)" }}
          >
            THE<br />
            <span style={{ color: "var(--brand-orange)", fontStyle: "italic" }}>
              ROADMAP.
            </span>
          </h1>
          <p className="font-serif italic text-[15px] leading-[1.4] max-w-[48ch] opacity-85">
            Five pillars, four lanes, and a hard cap of three things we&apos;ll
            actually finish this quarter. If you&apos;re reading this, you&apos;re on
            the team that decides which three.
          </p>
        </div>

        <div className="relative z-10 flex flex-col justify-center">
          <button
            onClick={() => signIn("microsoft-entra-id", { callbackUrl })}
            className="flex items-center gap-2.5 bg-cream text-ink border-2 border-cream px-5 py-4 font-display text-[14px] tracking-[-0.01em] uppercase shadow-[5px_5px_0_var(--brand-orange)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[3px_3px_0_var(--brand-orange)] transition-transform cursor-pointer"
          >
            <span
              className="grid grid-cols-2 gap-[1px] w-5 h-5 flex-shrink-0"
              aria-hidden
            >
              <span className="bg-[#f25022]" />
              <span className="bg-[#7fba00]" />
              <span className="bg-[#00a4ef]" />
              <span className="bg-[#ffb900]" />
            </span>
            SIGN IN WITH ENTRA ID →
          </button>
          <div className="mt-4 font-mono text-[10px] tracking-[0.08em] opacity-55">
            AUTH VIA MICROSOFT · SESSION 24H · PATS IN SETTINGS
          </div>
        </div>

        <span
          aria-hidden
          className="absolute bottom-4 right-5 border-2 border-cream font-display text-[11px] tracking-[0.18em] px-2 py-1 opacity-80 bg-ink"
          style={{ transform: "rotate(-3deg)", zIndex: 2 }}
        >
          INTERNAL · v{packageJson.version}
        </span>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}
