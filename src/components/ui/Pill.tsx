"use client";
import { T } from "@/components/tokens";
import { ReactNode } from "react";

const MAP: Record<string, [string, string]> = {
  green: [T.greenTint, T.greenDeep],
  amber: [T.amberTint, T.amberDeep],
  rust: [T.rustTint, T.rustDeep],
  neutral: ["#F1EEFB", T.inkSoft],
  blue: [T.blueTint, T.blueDeep],
  purple: [T.purpleTint, T.purpleDeep],
  yellow: [T.yellowTint, T.yellowDeep],
};

export function Pill({ children, tone = "purple" }: { children: ReactNode; tone?: keyof typeof MAP }) {
  const [bg, fg] = MAP[tone] || MAP.purple;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide"
      style={{ background: bg, color: fg, fontFamily: "var(--font-jakarta)" }}
    >
      {children}
    </span>
  );
}

export function AIChip({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-extrabold"
      style={{ background: T.purple, color: "#fff", fontFamily: "var(--font-jakarta)" }}
    >
      ✨ {children}
    </div>
  );
}
