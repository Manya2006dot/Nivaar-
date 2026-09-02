"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Camera, Globe } from "lucide-react";
import { T, tintShadow, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { LanguagePicker } from "@/components/ui/LanguagePicker";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";
import { haversineMeters, formatDistance } from "@/lib/distance";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { ISSUE_EMOJI } from "@/lib/routing";

export default function HomeScreen() {
  const router = useRouter();
  const { t, tIssue } = useLanguage();
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [unresolved, setUnresolved] = useState(0);
  const [inProgress, setInProgress] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [nearby, setNearby] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const userId = await ensureAuthenticated();
        const supabase = createClient();
        const { data } = await supabase.from("reports").select("status, is_demo").eq("user_id", userId).eq("is_demo", false);
        const rows = data || [];
        setUnresolved(rows.filter((r) => r.status === "Submitted" || r.status === "Acknowledged").length);
        setInProgress(rows.filter((r) => r.status === "Assigned" || r.status === "In Progress").length);
        setResolved(rows.filter((r) => r.status === "Resolved").length);

        const { data: near } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(4);
        setNearby(near || []);
      } finally {
        setLoading(false);
      }
    })();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition((pos) => setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }), () => {}, { maximumAge: 60000, timeout: 5000 });
    }
  }, []);

  return (
    <div className="flex flex-col min-h-full px-6 pt-6 pb-6">
      {showLangPicker && <LanguagePicker onClose={() => setShowLangPicker(false)} />}
      <div className="flex items-center justify-between mb-4">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 26, color: T.ink, letterSpacing: 0.5 }}>NIVAAR</div>
        <button onClick={() => setShowLangPicker(true)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: T.purpleTint }}><Globe size={16} color={T.purpleDeep} /></button>
      </div>

      <div className="flex justify-center mb-6">
        <div className="px-4 py-1.5 rounded-full" style={{ background: T.yellow }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, color: T.ink, fontFamily: "var(--font-jakarta)" }}>{t("home_tagline")} ✨</span>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center py-4 relative">
        <div className="absolute rounded-full pointer-events-none" style={{ width: 170, height: 170, background: T.blueTint, opacity: 0.7 }} />
        <div className="absolute text-3xl" style={{ top: 8, left: 24 }}>🏙️</div>
        <div className="absolute text-2xl" style={{ bottom: 20, right: 20 }}>🌳</div>
        <button onClick={() => router.push("/report")} className="relative w-36 h-36 rounded-[36px] flex items-center justify-center active:scale-90 transition" style={{ background: T.purple, boxShadow: tintShadow(T.purpleDeep) }}>
          <span className="absolute inset-0 rounded-[36px] animate-ping" style={{ background: T.purple, opacity: 0.2 }} />
          <Camera size={42} color="#fff" strokeWidth={1.8} />
        </button>
        <div className="mt-5 text-center">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 20, color: T.ink }}>{t("home_tap_to_report")}</div>
          <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 500 }}>{t("home_take_photo")}</div>
        </div>
      </div>

      <div className="mb-5 rounded-[24px] p-4" style={{ background: T.purple, boxShadow: tintShadow(T.purpleDeep) }}>
        <div className="flex items-center justify-between mb-3">
          <span style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{t("home_whats_around")}</span>
          <Link href="/nearby" style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>{t("home_see_all")}</Link>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[[unresolved, t("home_unresolved"), T.rust], [inProgress, t("home_in_progress"), T.amber], [resolved, t("home_resolved"), T.green]].map(([n, l, c]: any) => (
            <div key={l} className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: c }}>
                <span style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 16, color: "#fff" }}>{n}</span>
              </div>
              <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.9)", fontWeight: 700, marginTop: 4 }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2.5">
          <div className="text-[13px] font-extrabold" style={{ color: T.ink }}>{t("home_nearby_issues")}</div>
          <Link href="/nearby" style={{ fontSize: 12, fontWeight: 700, color: T.purpleDeep }}>{t("home_see_all")}</Link>
        </div>
        <div className="space-y-2">
          {loading && <div className="text-[12.5px]" style={{ color: T.inkSoft }}>{t("home_loading")}</div>}
          {!loading && nearby.length === 0 && <div className="text-[12.5px]" style={{ color: T.inkSoft }}>{t("home_no_reports_nearby")}</div>}
          {nearby.map((r) => {
            const dist = myLoc ? haversineMeters(myLoc, { lat: r.latitude, lng: r.longitude }) : null;
            return (
              <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center gap-3 rounded-[18px] p-3" style={{ background: T.card, boxShadow: "0 4px 14px -8px rgba(139,127,209,0.3)" }}>
                <div className="w-9 h-9 rounded-[12px] flex items-center justify-center text-base" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>
                <div className="flex-1 min-w-0">
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{tIssue(r.issue_type)}</div>
                  <div style={{ fontSize: 11, color: T.inkSoft }}>{dist != null ? `${formatDistance(dist)} · ` : ""}{r.affected_count} {r.affected_count === 1 ? "report" : "reports"}</div>
                </div>
                <Pill tone={severityTone(r.severity)}>{r.severity}</Pill>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
