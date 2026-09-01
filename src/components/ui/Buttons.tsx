"use client";
import { T } from "@/components/tokens";
import { ReactNode } from "react";

export function PrimaryButton({
  children, onClick, disabled, icon, full = true, type = "button",
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; icon?: ReactNode; full?: boolean; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} flex items-center justify-center gap-2 rounded-2xl py-4 font-extrabold text-[16px] active:scale-[0.95] active:translate-y-0.5 transition disabled:opacity-40`}
      style={{
        background: disabled ? T.sage : `linear-gradient(135deg, ${T.green}, ${T.greenDeep})`,
        color: "#fff",
        fontFamily: "var(--font-jakarta)",
        border: "3px solid #0D2E1E",
        boxShadow: disabled ? "none" : "4px 4px 0px #0D2E1E",
      }}
    >
      {children}
      {icon}
    </button>
  );
}

export function SecondaryButton({
  children, onClick, full = true,
}: { children: ReactNode; onClick?: () => void; full?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${full ? "w-full" : ""} rounded-2xl py-4 font-extrabold text-[16px] active:scale-[0.95] active:translate-y-0.5 transition`}
      style={{ background: T.card, color: T.ink, border: `3px solid ${T.ink}`, fontFamily: "var(--font-jakarta)", boxShadow: `4px 4px 0px ${T.ink}` }}
    >
      {children}
    </button>
  );
}
