"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { ISSUE_EMOJI } from "@/lib/routing";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export default function ReportsScreen() {
  const { t, tIssue, tStatus } = useLanguage();
  const [tab, setTab] = useState<"all" | "active" | "resolved">("all");
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const userId = await ensureAuthenticated();
        const supabase = createClient();
        const { data } = await supabase.from("reports").select("*").eq("user_id", userId).order("created_at", { ascending: false });
        setReports(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = reports.filter((r) => r.status !== "Resolved");
  const resolved = reports.filter((r) => r.status === "Resolved");
  const list = tab === "all" ? reports : tab === "active" ? active : resolved;

  const tabs: { key: "all" | "active" | "resolved"; label: string; count: number }[] = [
    { key: "all", label: t("reports_all"), count: reports.length },
    { key: "active", label: t("reports_active"), count: active.length },
    { key: "resolved", label: t("reports_resolved"), count: resolved.length },
  ];

  return (
    <div className="flex flex-col min-h-full px-6 pt-6">
      <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>{t("reports_title")}</div>
      <div className="flex gap-2 mt-4 mb-4">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className="px-4 py-2 rounded-full text-[13px] font-extrabold transition active:scale-95"
            style={{
              background: tab === key ? T.purple : T.card,
              color: tab === key ? "#fff" : T.inkSoft,
              boxShadow: tab === key ? "0 6px 16px -6px rgba(139,127,209,0.6)" : "0 4px 14px -8px rgba(139,127,209,0.25)",
            }}
          >
            {label} ({count})
          </button>
        ))}
      </div>
      <div className="space-y-3 pb-4">
        {loading && <div className="text-center py-10" style={{ color: T.inkSoft, fontSize: 13.5 }}>{t("home_loading")}</div>}
        {!loading && list.length === 0 && <div className="text-center py-10" style={{ color: T.inkSoft, fontSize: 13.5 }}>{t("reports_nothing_yet")}</div>}
        {list.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="w-full text-left rounded-[24px] p-4 flex gap-3 active:scale-[0.99] transition" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.3)" }}>
            {r.image_url ? (
              <img src={r.image_url} className="w-14 h-14 rounded-[18px] object-cover shrink-0" alt="" />
            ) : (
              <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl shrink-0" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>
            )}
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div style={{ fontWeight: 700, fontSize: 14.5, color: T.ink }}>{tIssue(r.issue_type)}</div>
                <div className="flex gap-1.5"><Pill tone={severityTone(r.severity)}>{r.severity}</Pill>{r.is_demo && <Pill tone="amber">Demo</Pill>}</div>
              </div>
              <div style={{ fontSize: 12.5, color: T.inkSoft }}>{r.landmark}</div>
              <div className="flex items-center gap-1.5 mt-1.5" style={{ color: T.purpleDeep, fontSize: 12, fontWeight: 700 }}>
                <Clock size={12} /> {tStatus(r.status)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
