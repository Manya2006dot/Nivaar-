"use client";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Lang, t as translate, tIssueType as translateIssue, tStatus as translateStatus } from "./translations";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";

interface Ctx {
  lang: Lang; setLang: (l: Lang) => void;
  t: (key: Parameters<typeof translate>[0]) => string;
  tIssue: (issueType: string) => string;
  tStatus: (status: string) => string;
  ready: boolean;
}
const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? (localStorage.getItem("nivaar_lang") as Lang | null) : null;
    if (stored) setLangState(stored);
    setReady(true);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("nivaar_lang", l);
    // Best-effort persist to the user's profile too.
    (async () => {
      try {
        const userId = await ensureAuthenticated();
        const supabase = createClient();
        await supabase.from("profiles").update({ preferred_language: l }).eq("id", userId);
      } catch {
        // Non-fatal — localStorage already has it.
      }
    })();
  };

  return (
    <LanguageContext.Provider value={{
      lang, setLang,
      t: (key) => translate(key, lang),
      tIssue: (issueType) => translateIssue(issueType, lang),
      tStatus: (status) => translateStatus(status, lang),
      ready,
    }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used inside LanguageProvider");
  return ctx;
}
