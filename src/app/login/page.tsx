"use client";

import { Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import packageJson from "../../../package.json";

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
          className="absolute bottom-4 right-5 border-2 border-cream font-display text-[11px] tracking-[0.18em] px-2 py-1 opacity-80"
          style={{ transform: "rotate(-3deg)", zIndex: 1 }}
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
