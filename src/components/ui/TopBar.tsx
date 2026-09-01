"use client";
import { ChevronLeft } from "lucide-react";
import { T } from "@/components/tokens";

export function TopBar({ title, onBack }: { title?: string; onBack?: () => void }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      {onBack ? (
        <button onClick={onBack} className="w-9 h-9 rounded-full flex items-center justify-center -ml-2 active:scale-95 transition" style={{ color: T.ink }}>
          <ChevronLeft size={22} />
        </button>
      ) : <div className="w-9" />}
      {title && (
        <div className="text-[13px] tracking-wide uppercase font-semibold" style={{ color: T.inkSoft, fontFamily: "var(--font-jakarta)" }}>
          {title}
        </div>
      )}
      <div className="w-9" />
    </div>
  );
}
