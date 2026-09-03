"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Trash2, AlertTriangle, Droplet, Waves, Lightbulb, MoreHorizontal, Heart } from "lucide-react";
import { NivaarLogo } from "@/components/NivaarLogo";
import { ParkScene } from "@/components/ui/ParkScene";
import { ensureAuthenticated } from "@/lib/supabase/client";

// Colors scoped to THIS screen only — brighter/more saturated than the rest
// of the app's soft palette (src/components/tokens.ts), per the explicit
// request to make the welcome screen more vivid without touching the
// muted palette every other screen relies on.
const W = {
  bg1: "#FFF6E0", bg2: "#FFFDF6",
  purple: "#4A2E8C", purpleDeep: "#331F63",
  yellow: "#FFC94A",
  green: "#3FAE63", greenTint: "#E3F5E5",
  slate: "#5B6472", slateTint: "#ECEEF1",
  blue: "#3E93D6", blueTint: "#E4F2FC",
  violet: "#6B5CA5", violetTint: "#ECE8F7",
  amber: "#D98A1F", amberTint: "#FFF1D8",
  coral: "#E85C3F", coralTint: "#FFE7E0",
  ink: "#241B3D", inkSoft: "#6C6480",
};

const CATEGORIES = [
  { label: "Garbage", sub: "Overflowing waste", icon: Trash2, fg: W.green, bg: W.greenTint },
  { label: "Potholes", sub: "Damaged roads", icon: AlertTriangle, fg: W.slate, bg: W.slateTint },
  { label: "Water Leakage", sub: "Leakage & wastage", icon: Droplet, fg: W.blue, bg: W.blueTint },
  { label: "Sewage / Drainage", sub: "Blocked or overflowing", icon: Waves, fg: W.violet, bg: W.violetTint },
  { label: "Broken Streetlight", sub: "Not working", icon: Lightbulb, fg: W.amber, bg: W.amberTint },
  { label: "Other Issues", sub: "Anything else in your area", icon: MoreHorizontal, fg: W.coral, bg: W.coralTint },
];

export default function WelcomeScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ensureAuthenticated().catch(() => {});
    // Returning users (who already picked a language) skip onboarding
    // entirely and land straight on Home — same behavior as before this
    // screen existed, just one hop earlier in the chain.
    if (typeof window !== "undefined" && localStorage.getItem("nivaar_lang")) {
      router.replace("/home");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: `linear-gradient(180deg, ${W.bg1}, ${W.bg2} 55%)` }}>
      {/* ---------- Hero ---------- */}
      <div className="relative px-6 pt-10 pb-8 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ opacity: 0.9 }}><ParkScene /></div>

        <div className="relative">
          <div className="flex justify-center mb-3"><NivaarLogo size={92} /></div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 40, letterSpacing: 1, color: W.purple, lineHeight: 1 }}>NIVAAR</div>

          <div className="mt-3 flex justify-center gap-1.5 flex-wrap" style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 19 }}>
            <span style={{ color: W.purple }}>Report.</span>
            <span style={{ color: W.coral }}>Resolve.</span>
            <span style={{ color: W.green }}>Improve.</span>
          </div>

          <div className="mt-3 text-[13.5px] leading-snug" style={{ color: W.inkSoft, fontWeight: 500 }}>
            AI-powered civic reporting<br />for a cleaner, safer, better city.
          </div>
        </div>
      </div>

      {/* ---------- White panel ---------- */}
      <div className="relative rounded-t-[36px] px-6 pt-7 pb-8" style={{ background: "#FFFFFF", boxShadow: "0 -12px 30px -20px rgba(74,46,140,0.35)" }}>
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="h-[2px] w-8 rounded-full" style={{ background: W.purple, opacity: 0.35 }} />
          <span style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 18, color: W.ink }}>What can you report?</span>
          <span className="h-[2px] w-8 rounded-full" style={{ background: W.purple, opacity: 0.35 }} />
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <div key={c.label} className="rounded-[20px] p-3 flex flex-col items-center text-center gap-1.5" style={{ background: c.bg }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "#fff" }}>
                  <Icon size={19} color={c.fg} strokeWidth={2.2} />
                </div>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: W.ink, lineHeight: 1.15 }}>{c.label}</div>
                <div style={{ fontSize: 9.5, color: W.inkSoft, fontWeight: 600, lineHeight: 1.15 }}>{c.sub}</div>
              </div>
            );
          })}
        </div>

        <div className="mt-7 text-center">
          <div className="flex items-center justify-center gap-1.5" style={{ fontSize: 13.5, fontWeight: 700, color: W.ink }}>
            <Heart size={14} color={W.coral} fill={W.coral} /> Small reports, big change.
          </div>
          <div style={{ fontSize: 12, color: W.inkSoft, fontWeight: 500, marginTop: 2 }}>Let&apos;s build a better tomorrow together.</div>
        </div>

        <button
          onClick={() => router.push("/language")}
          className="w-full mt-5 rounded-full py-4 flex items-center justify-center gap-3 active:scale-[0.97] transition"
          style={{ background: `linear-gradient(135deg, ${W.purple}, ${W.purpleDeep})`, boxShadow: `0 14px 28px -12px ${W.purple}99` }}
        >
          <span style={{ fontFamily: "var(--font-jakarta)", fontWeight: 800, fontSize: 17, color: "#fff" }}>Get Started</span>
          <span className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#fff" }}>
            <ArrowRight size={16} color={W.purple} strokeWidth={2.6} />
          </span>
        </button>
      </div>
    </div>
  );
}
