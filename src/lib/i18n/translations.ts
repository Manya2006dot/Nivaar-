import en from "@/locales/en.json";
import kn from "@/locales/kn.json";
import hi from "@/locales/hi.json";
import ta from "@/locales/ta.json";
import te from "@/locales/te.json";
import ml from "@/locales/ml.json";
import mr from "@/locales/mr.json";
import bn from "@/locales/bn.json";

export type Lang = "en" | "kn" | "hi" | "ta" | "te" | "ml" | "mr" | "bn";

export const LANGUAGES: { code: Lang; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ta", label: "Tamil", native: "தமிழ்" },
  { code: "te", label: "Telugu", native: "తెలుగు" },
  { code: "ml", label: "Malayalam", native: "മലയാളം" },
  { code: "mr", label: "Marathi", native: "मराठी" },
  { code: "bn", label: "Bengali", native: "বাংলা" },
];

export type TranslationKey = keyof typeof en;

const DICTS: Record<Lang, Record<string, string>> = { en, kn, hi, ta, te, ml, mr, bn };

// Static UI chrome (headings, buttons, labels, statuses, issue-type names)
// is fully translated from the JSON files above. AI-generated free text —
// the composed complaint description and voice-note transcripts — is NOT
// machine-translated: it's the AI's/citizen's own words, generated fresh per
// report, and translating it would need a separate translation API call
// this app doesn't currently make. That content displays as originally
// generated regardless of UI language.
export function t(key: TranslationKey, lang: Lang): string {
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? key;
}

// Translate a fixed-vocabulary issue type / status coming from the database
// (these ARE part of the static dictionary, unlike free-text descriptions).
export function tIssueType(issueType: string, lang: Lang): string {
  const key = `issue_${issueType}` as TranslationKey;
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? issueType;
}
export function tStatus(status: string, lang: Lang): string {
  const key = `status_${status}` as TranslationKey;
  return DICTS[lang]?.[key] ?? DICTS.en[key] ?? status;
}
