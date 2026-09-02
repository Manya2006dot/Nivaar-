"use client";
import { useEffect, useState } from "react";
import { Globe, Bell, MapPinned, Lock, HelpCircle, ChevronRight } from "lucide-react";
import { T, tintShadow } from "@/components/tokens";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";

export default function ProfileScreen() {
  const { lang, t } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [stats, setStats] = useState({ reported: 0, resolved: 0, supported: 0 });

  useEffect(() => {
    (async () => {
      const userId = await ensureAuthenticated();
      const supabase = createClient();
      const { data } = await supabase.from("reports").select("status, affected_count, is_demo").eq("user_id", userId).eq("is_demo", false);
      const rows = data || [];
      setStats({
        reported: rows.length,
        resolved: rows.filter((r) => r.status === "Resolved").length,
        supported: rows.reduce((s, r) => s + (r.affected_count || 1), 0),
      });
    })();
  }, []);

  const settings = [
    { icon: Globe, label: t("profile_language"), value: LANGUAGES.find((l) => l.code === lang)?.native, color: T.blue, onClick: () => setShowLangPicker(true) },
    { icon: Bell, label: t("profile_notifications"), value: "On", color: T.yellowDeep },
    { icon: MapPinned, label: t("profile_location"), value: "Auto-detect", color: T.green },
    { icon: Lock, label: t("profile_privacy"), value: "", color: T.purple },
    { icon: HelpCircle, label: t("profile_help"), value: "", color: T.rust },
  ];

  return (
    <div className="flex flex-col min-h-full px-6 pt-6 pb-4">
      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
      <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>{t("profile_title")}</div>

      <div className="mt-4 rounded-[24px] p-5 relative overflow-hidden" style={{ background: T.purple, boxShadow: tintShadow(T.purpleDeep) }}>
        <div className="absolute rounded-full pointer-events-none" style={{ width: 100, height: 100, top: -30, right: -20, background: T.yellow, opacity: 0.25 }} />
        <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 800 }}>✨ {t("profile_impact")}</div>
        <div className="grid grid-cols-3 gap-2 mt-3 relative">
          {[[stats.reported, t("profile_reported")], [stats.resolved, t("profile_resolved")], [stats.supported, t("profile_supported")]].map(([n, l]) => (
            <div key={l as string}>
              <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 26, color: "#fff" }}>{n}</div>
              <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.85)", fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-[24px] overflow-hidden" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.3)" }}>
        {settings.map((s, i) => {
          const Icon = s.icon;
          const Wrapper = s.onClick ? "button" : "div";
          return (
            <Wrapper
              key={s.label}
              {...(s.onClick ? { onClick: s.onClick } : {})}
              className="w-full flex items-center gap-3 px-4 py-3.5"
              style={{ borderBottom: i < settings.length - 1 ? `1px solid ${T.line}` : "none" }}
            >
              <div className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ background: s.color + "22" }}><Icon size={16} color={s.color} /></div>
              <span className="flex-1 text-left" style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{s.label}</span>
              {s.value && <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>{s.value}</span>}
              <ChevronRight size={15} color={T.sage} />
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
