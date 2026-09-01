"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Clock } from "lucide-react";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { ISSUE_EMOJI } from "@/lib/routing";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";

export default function ReportsScreen() {
  const [tab, setTab] = useState<"active" | "resolved">("active");
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
  const list = tab === "active" ? active : resolved;

  return (
    <div className="flex flex-col min-h-full px-6 pt-6">
      <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>My reports</div>
      <div className="flex gap-2 mt-4 mb-4">
        {(["active", "resolved"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className="px-4 py-2 rounded-full text-[13px] font-extrabold capitalize transition active:scale-95" style={{ background: tab === t ? T.green : T.card, color: tab === t ? "#fff" : T.inkSoft, border: `2px solid ${tab === t ? T.green : T.line}` }}>
            {t} ({t === "active" ? active.length : resolved.length})
          </button>
        ))}
      </div>
      <div className="space-y-3 pb-4">
        {loading && <div className="text-center py-10" style={{ color: T.inkSoft, fontSize: 13.5 }}>Loading…</div>}
        {!loading && list.length === 0 && <div className="text-center py-10" style={{ color: T.inkSoft, fontSize: 13.5 }}>Nothing here yet.</div>}
        {list.map((r) => (
          <Link key={r.id} href={`/reports/${r.id}`} className="w-full text-left rounded-[24px] p-4 flex gap-3 active:scale-[0.99] transition" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            {r.image_url ? <img src={r.image_url} className="w-14 h-14 rounded-[18px] object-cover shrink-0" alt="" /> : <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl shrink-0" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>}
            <div className="flex-1">
              <div className="flex items-center justify-between"><div style={{ fontWeight: 700, fontSize: 14.5, color: T.ink }}>{r.issue_type}</div><div className="flex gap-1.5"><Pill tone={severityTone(r.severity)}>{r.severity}</Pill>{r.is_demo && <Pill tone="amber">Demo</Pill>}</div></div>
              <div style={{ fontSize: 12.5, color: T.inkSoft }}>{r.landmark}</div>
              <div className="flex items-center gap-1.5 mt-1.5" style={{ color: T.green, fontSize: 12, fontWeight: 600 }}><Clock size={12} /> {r.status}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
