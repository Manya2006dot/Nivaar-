"use client";
import { Check } from "lucide-react";
import { T } from "@/components/tokens";

const STEPS = ["Capture", "Review", "Submit", "Track"];

export function Stepper({ active }: { active: number }) {
  return (
    <div className="flex items-center justify-between px-6 pb-2">
      {STEPS.map((label, i) => {
        const stepNum = i + 1;
        const done = stepNum < active;
        const current = stepNum === active;
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[12px] font-extrabold"
                style={{
                  background: done || current ? T.purple : T.card,
                  color: done || current ? "#fff" : T.sage,
                  border: done || current ? "none" : `2px solid ${T.line}`,
                }}
              >
                {done ? <Check size={13} strokeWidth={3} /> : stepNum}
              </div>
              <span className="text-[10px] font-bold mt-1" style={{ color: current ? T.purpleDeep : T.inkSoft }}>{label}</span>
            </div>
            {stepNum < STEPS.length && (
              <div className="flex-1 h-[2px] mx-1 mb-4" style={{ background: done ? T.purple : T.line }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
