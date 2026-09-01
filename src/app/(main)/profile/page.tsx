"use client";
import { useEffect, useState } from "react";
import { Globe, Bell, MapPinned, Lock, HelpCircle, ChevronRight } from "lucide-react";
import { T } from "@/components/tokens";
import { LANGUAGES } from "@/lib/i18n/translations";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";

export default function ProfileScreen() {
  const { lang, setLang } = useLanguage();
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
    { icon: Globe, label: "Language", value: LANGUAGES.find((l) => l.code === lang)?.native, color: T.blue },
    { icon: Bell, label: "Notifications", value: "On", color: T.sun },
    { icon: MapPinned, label: "Location", value: "Auto-detect", color: T.green },
    { icon: Lock, label: "Privacy", value: "", color: T.purple },
    { icon: HelpCircle, label: "Help & Support", value: "", color: T.rust },
  ];

  return (
    <div className="flex flex-col min-h-full px-6 pt-6 pb-4">
      <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>Profile</div>
      <div className="mt-4 rounded-[24px] p-5 relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${T.green}, ${T.blue})`, border: `3px solid ${T.ink}`, boxShadow: `5px 5px 0px ${T.ink}` }}>
        <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 800 }}>✨ MY CIVIC IMPACT</div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[[stats.reported, "Problems reported"], [stats.resolved, "Issues resolved"], [stats.supported, "People supported"]].map(([n, l]) => (
            <div key={l as string}><div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 26, color: "#fff" }}>{n}</div><div style={{ fontSize: 10.5, color: "#EAFBF3", fontWeight: 600 }}>{l}</div></div>
          ))}
        </div>
      </div>
      <div className="mt-5 rounded-[24px] overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        {settings.map((s, i) => { const Icon = s.icon; return (
          <div key={s.label} className="w-full flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: i < settings.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div className="w-8 h-8 rounded-[14px] flex items-center justify-center" style={{ background: s.color + "22" }}><Icon size={16} color={s.color} /></div>
            <span className="flex-1 text-left" style={{ fontSize: 14, color: T.ink, fontWeight: 600 }}>{s.label}</span>
            {s.label === "Language" ? (
              <select value={lang} onChange={(e) => setLang(e.target.value as any)} style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600, background: "transparent" }}>
                {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.native}</option>)}
              </select>
            ) : s.value && <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>{s.value}</span>}
            <ChevronRight size={15} color={T.sage} />
          </div>
        ); })}
      </div>
    </div>
  );
}
