"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, ChevronRight } from "lucide-react";
import { T } from "@/components/tokens";
import { PrimaryButton } from "@/components/ui/Buttons";
import { LANGUAGES, Lang } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ensureAuthenticated } from "@/lib/supabase/client";

export default function LanguageScreen() {
  const router = useRouter();
  const { setLang, ready } = useLanguage();
  const [choice, setChoice] = useState<Lang>("en");
  const [alreadyChosen, setAlreadyChosen] = useState(false);

  useEffect(() => {
    // Kick off the anonymous session early so it's ready by the time the
    // user reaches the report flow.
    ensureAuthenticated().catch(() => {});
    if (ready && typeof window !== "undefined" && localStorage.getItem("nivaar_lang")) {
      setAlreadyChosen(true);
      router.replace("/home");
    }
  }, [ready, router]);

  if (alreadyChosen) return null;

  return (
    <div className="flex flex-col min-h-full px-6 pt-14 pb-8 justify-between">
      <div>
        <div className="text-[28px] mb-1" style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, color: T.ink }}>Welcome to Nivaar 👋</div>
        <div className="text-[14.5px] mb-8" style={{ color: T.inkSoft }}>How would you like to use Nivaar?</div>
        <div className="grid grid-cols-2 gap-3">
          {LANGUAGES.map((l) => {
            const active = choice === l.code;
            return (
              <button key={l.code} onClick={() => setChoice(l.code)} className="rounded-[24px] px-4 py-4 text-left transition active:scale-95" style={{ background: active ? T.greenTint : T.card, border: `2px solid ${active ? T.green : T.line}` }}>
                <div style={{ fontFamily: "var(--font-baloo)", fontSize: 19, color: active ? T.greenDeep : T.ink, fontWeight: 600 }}>{l.native}</div>
                <div style={{ fontSize: 11.5, color: T.inkSoft, fontWeight: 600 }}>{l.label}</div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 mt-7 px-1" style={{ color: T.inkSoft }}>
          <Mic size={15} />
          <span className="text-[12.5px] font-medium">You can also speak your reports in this language.</span>
        </div>
      </div>
      <PrimaryButton onClick={() => { setLang(choice); router.push("/home"); }} icon={<ChevronRight size={18} />}>
        Continue
      </PrimaryButton>
    </div>
  );
}
