"use client";
import { T, SOFT_SHADOW, tintShadow } from "@/components/tokens";
import { ReactNode } from "react";

export function PrimaryButton({
  children, onClick, disabled, icon, full = true, type = "button", variant = "purple",
}: { children: ReactNode; onClick?: () => void; disabled?: boolean; icon?: ReactNode; full?: boolean; type?: "button" | "submit"; variant?: "purple" | "yellow" }) {
  const isYellow = variant === "yellow";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? "w-full" : ""} flex items-center justify-center gap-2 rounded-[20px] py-4 font-extrabold text-[16px] active:scale-[0.96] transition disabled:opacity-40`}
      style={{
        background: disabled ? T.sage : isYellow ? T.yellow : T.purple,
        color: isYellow ? T.ink : "#fff",
        fontFamily: "var(--font-jakarta)",
        boxShadow: disabled ? "none" : isYellow ? tintShadow(T.yellowDeep) : tintShadow(T.purpleDeep),
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
      className={`${full ? "w-full" : ""} rounded-[20px] py-4 font-extrabold text-[16px] active:scale-[0.96] transition`}
      style={{ background: T.card, color: T.purpleDeep, border: `2px solid ${T.purpleTint}`, fontFamily: "var(--font-jakarta)", boxShadow: SOFT_SHADOW }}
    >
      {children}
    </button>
  );
}
