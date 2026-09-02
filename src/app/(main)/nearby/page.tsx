"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { SlidersHorizontal } from "lucide-react";
import { T, chipBg, severityTone, categoryColor } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { MapView, MapMarker } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";
import { createClient } from "@/lib/supabase/client";
import { haversineMeters, formatDistance } from "@/lib/distance";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const DEFAULT_LOC = { lat: 12.9945, lng: 77.691 };

export default function NearbyScreen() {
  const { t, tIssue } = useLanguage();
  const [reports, setReports] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);
  const [filter, setFilter] = useState("all");
  const [myLoc, setMyLoc] = useState<{ lat: number; lng: number } | null>(null);

  const FILTERS: { key: string; label: string; match: (t: string) => boolean; color: string }[] = [
    { key: "all", label: t("nearby_filter_all"), match: () => true, color: T.purple },
    { key: "potholes", label: t("nearby_filter_potholes"), match: (x) => x === "Pothole" || x === "Road/infrastructure damage", color: T.rust },
    { key: "garbage", label: t("nearby_filter_garbage"), match: (x) => x === "Garbage/waste issue", color: T.amber },
    { key: "water", label: t("nearby_filter_water"), match: (x) => x === "Water leakage" || x === "Drainage issue", color: T.blue },
    { key: "lights", label: t("nearby_filter_lights"), match: (x) => x === "Broken streetlight", color: T.green },
  ];

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50);
      setReports(data || []);
    })();
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setMyLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { maximumAge: 60000, timeout: 5000 }
      );
    }
  }, []);

  const activeFilter = FILTERS.find((f) => f.key === filter)!;
  const filtered = reports.filter((r) => activeFilter.match(r.issue_type));

  const markers: MapMarker[] = filtered.map((r) => ({
    lat: r.latitude, lng: r.longitude, color: categoryColor(r.issue_type), data: r,
  }));
  const center = myLoc || (filtered[0] ? { lat: filtered[0].latitude, lng: filtered[0].longitude } : DEFAULT_LOC);

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-6 pt-6 pb-3 flex items-center justify-between">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 21, color: T.ink }}>{t("nearby_title")}</div>
        <SlidersHorizontal size={17} color={T.inkSoft} />
      </div>

      <div className="px-6 flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)} className="px-3.5 py-1.5 rounded-full text-[12.5px] font-bold shrink-0 transition" style={{ background: active ? f.color : f.color + "1A", color: active ? "#fff" : f.color }}>
              {f.label}
            </button>
          );
        })}
      </div>

      <div className="relative mx-6 mt-4 rounded-[24px] overflow-hidden" style={{ height: 220 }}>
        <MapView height={220} center={center} zoom={13} markers={markers} onMarkerClick={(m) => setSel(m.data)} />
      </div>

      {sel && (
        <Link href={`/reports/${sel.id}`} className="mx-6 mt-4 rounded-[20px] p-4 block" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.35)" }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[16px] flex items-center justify-center text-xl" style={{ background: chipBg(sel.issue_type) }}>{ISSUE_EMOJI[sel.issue_type]}</div>
            <div className="flex-1"><div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{tIssue(sel.issue_type)}</div><div style={{ fontSize: 12, color: T.inkSoft }}>{sel.landmark} · {sel.affected_count}</div></div>
            <Pill tone={severityTone(sel.severity)}>{sel.severity}</Pill>
          </div>
        </Link>
      )}

      <div className="px-6 mt-5">
        {filtered.length === 0 ? (
          <div className="text-center py-8 rounded-[20px]" style={{ background: T.card, color: T.inkSoft, fontSize: 13 }}>{t("nearby_no_reports")}</div>
        ) : (
          <div className="space-y-2.5">
            {filtered.slice(0, 10).map((r) => {
              const dist = myLoc ? haversineMeters(myLoc, { lat: r.latitude, lng: r.longitude }) : null;
              return (
                <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center gap-3 rounded-[20px] p-3" style={{ background: T.card, boxShadow: "0 4px 14px -8px rgba(139,127,209,0.3)" }}>
                  <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg shrink-0" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>
                  <div className="flex-1 min-w-0">
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{tIssue(r.issue_type)}</div>
                    <div style={{ fontSize: 11.5, color: T.inkSoft }}>{dist != null ? `${formatDistance(dist)} · ` : ""}{r.affected_count}</div>
                  </div>
                  {r.image_url && <img src={r.image_url} className="w-11 h-11 rounded-[12px] object-cover shrink-0" alt="" />}
                  <div className="flex flex-col gap-1 items-end shrink-0">
                    <Pill tone={severityTone(r.severity)}>{r.severity}</Pill>
                    {r.is_demo && <Pill tone="amber">Demo</Pill>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
