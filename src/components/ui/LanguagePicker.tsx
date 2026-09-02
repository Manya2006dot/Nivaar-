"use client";
import { X } from "lucide-react";
import { T } from "@/components/tokens";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguagePicker({ onClose }: { onClose: () => void }) {
  const { lang, setLang } = useLanguage();
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(43,37,64,0.45)" }} onClick={onClose}>
      <div className="w-full max-w-[430px] rounded-t-[28px] p-6 pb-8" style={{ background: T.card }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 18, color: T.ink }}>Language</div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: T.purpleTint }}><X size={16} color={T.purpleDeep} /></button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {LANGUAGES.map((l) => {
            const active = lang === l.code;
            return (
              <button key={l.code} onClick={() => { setLang(l.code); onClose(); }} className="rounded-[18px] px-4 py-3 text-left transition active:scale-95" style={{ background: active ? T.purple : T.purpleTint }}>
                <div style={{ fontFamily: "var(--font-baloo)", fontSize: 16, color: active ? "#fff" : T.ink, fontWeight: 700 }}>{l.native}</div>
                <div style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.8)" : T.inkSoft, fontWeight: 600 }}>{l.label}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
