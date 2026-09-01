"use client";
import { T } from "@/components/tokens";
import { ReactNode } from "react";

const MAP: Record<string, [string, string, string]> = {
  green: [T.greenTint, T.greenDeep, T.green],
  amber: [T.amberTint, "#B96A00", T.amber],
  rust: [T.rustTint, "#D63A2E", T.rust],
  neutral: ["#F0EFE8", T.inkSoft, T.sage],
  blue: [T.blueTint, "#1D6FCC", T.blue],
  purple: [T.purpleTint, "#6D3FE0", T.purple],
};

export function Pill({ children, tone = "green" }: { children: ReactNode; tone?: keyof typeof MAP }) {
  const [bg, fg, bd] = MAP[tone] || MAP.green;
  return (
    <span
      className="inline-block px-2.5 py-1 rounded-full text-[11px] font-extrabold tracking-wide"
      style={{ background: bg, color: fg, border: `1.5px solid ${bd}55`, fontFamily: "var(--font-jakarta)" }}
    >
      {children}
    </span>
  );
}

export function AIChip({ children }: { children: ReactNode }) {
  return (
    <div
      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12.5px] font-extrabold"
      style={{
        background: `linear-gradient(135deg, ${T.purple}, ${T.blue})`,
        color: "#fff",
        fontFamily: "var(--font-jakarta)",
        border: "2.5px solid #fff",
        boxShadow: "3px 3px 0px #0D2E1E33",
        transform: "rotate(-1.5deg)",
      }}
    >
      ✨ {children}
    </div>
  );
}
