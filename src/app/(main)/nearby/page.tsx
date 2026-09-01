"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { MapView, MapMarker } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_LOC = { lat: 12.9945, lng: 77.691 };

export default function NearbyScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [sel, setSel] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const { data } = await supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50);
      setReports(data || []);
    })();
  }, []);

  const markers: MapMarker[] = reports.map((r) => ({
    lat: r.latitude, lng: r.longitude,
    color: r.status === "Resolved" ? T.green : r.severity === "High" ? T.rust : T.amber,
    data: r,
  }));
  const center = reports[0] ? { lat: reports[0].latitude, lng: reports[0].longitude } : DEFAULT_LOC;

  return (
    <div className="flex flex-col min-h-full pb-4">
      <div className="px-6 pt-6 pb-3">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>Nearby</div>
        <div style={{ fontSize: 13, color: T.inkSoft, fontWeight: 500 }}>Civic issues reported by everyone using Nivaar</div>
      </div>
      <div className="relative mx-6 rounded-[32px] overflow-hidden" style={{ height: 230 }}>
        <MapView height={230} center={center} zoom={13} markers={markers} onMarkerClick={(m) => setSel(m.data)} />
      </div>
      <div className="flex gap-4 px-6 mt-3 text-[11.5px]" style={{ color: T.inkSoft }}>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: T.rust }} />High</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: T.amber }} />Medium/Low</span>
        <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: T.green }} />Resolved</span>
      </div>
      {sel && (
        <Link href={`/reports/${sel.id}`} className="mx-6 mt-4 rounded-[24px] p-4 block" style={{ background: T.card, border: `1px solid ${T.line}` }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-[18px] flex items-center justify-center text-xl" style={{ background: chipBg(sel.issue_type) }}>{ISSUE_EMOJI[sel.issue_type]}</div>
            <div className="flex-1"><div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{sel.issue_type}</div><div style={{ fontSize: 12, color: T.inkSoft }}>{sel.landmark} · {sel.affected_count} citizen{sel.affected_count === 1 ? "" : "s"}</div></div>
            <Pill tone={severityTone(sel.severity)}>{sel.severity}</Pill>
          </div>
        </Link>
      )}
      <div className="px-6 mt-5">
        <div className="text-[12px] font-bold uppercase tracking-wide mb-2.5" style={{ color: T.inkSoft }}>Recently reported nearby</div>
        {reports.length === 0 ? (
          <div className="text-center py-8 rounded-[24px]" style={{ background: T.card, border: `1px dashed ${T.line}`, color: T.inkSoft, fontSize: 13 }}>No reports yet — be the first to report something real.</div>
        ) : (
          <div className="space-y-2.5">
            {reports.slice(0, 8).map((r) => (
              <Link key={r.id} href={`/reports/${r.id}`} className="flex items-center gap-3 rounded-[24px] p-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
                <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>
                <div className="flex-1"><div style={{ fontWeight: 600, fontSize: 13.5, color: T.ink }}>{r.issue_type}</div><div style={{ fontSize: 11.5, color: T.inkSoft }}>{r.report_number}</div></div>
                <div className="flex flex-col gap-1 items-end"><Pill tone={severityTone(r.severity)}>{r.severity}</Pill>{r.is_demo && <Pill tone="amber">Demo</Pill>}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
