"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/Buttons";
import { MapView } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";
import { ensureAuthenticated } from "@/lib/supabase/client";

export default function AdminDashboard() {
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSeverity, setFilterSeverity] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  const load = async () => {
    await ensureAuthenticated();
    const res = await fetch("/api/admin/stats");
    if (res.status === 403) { setNeedsCode(true); return; }
    if (res.ok) { setStats(await res.json()); setNeedsCode(false); }
  };
  useEffect(() => { load(); }, []);

  const claimAdmin = async () => {
    setError("");
    const res = await fetch("/api/admin/claim", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
    if (!res.ok) { setError((await res.json()).error || "Failed"); return; }
    await load();
  };

  if (needsCode) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: T.bg }}>
        <div className="w-full max-w-sm rounded-[24px] p-6" style={{ background: T.card, border: `2px solid ${T.ink}` }}>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 20, color: T.ink }}>Admin access</div>
          <div className="text-[13px] mt-1 mb-4" style={{ color: T.inkSoft }}>Enter the admin access code to continue.</div>
          <input type="password" value={code} onChange={(e) => setCode(e.target.value)} className="w-full rounded-[16px] p-3 mb-3" style={{ border: `1.5px solid ${T.line}` }} placeholder="Access code" />
          {error && <div className="text-[12.5px] mb-3" style={{ color: T.rust }}>{error}</div>}
          <PrimaryButton onClick={claimAdmin}>Continue</PrimaryButton>
        </div>
      </div>
    );
  }

  if (!stats) return <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.inkSoft }}>Loading…</div>;

  const filtered = stats.reports.filter((r: any) =>
    (!filterStatus || r.status === filterStatus) &&
    (!filterSeverity || r.severity === filterSeverity) &&
    (!filterCategory || r.issue_type === filterCategory)
  );
  const markers = filtered.filter((r: any) => r.latitude).map((r: any) => ({ lat: r.latitude, lng: r.longitude, color: r.status === "Resolved" ? T.green : r.severity === "High" ? T.rust : T.amber, data: r }));

  return (
    <div className="min-h-screen px-6 py-8 max-w-5xl mx-auto" style={{ background: T.bg }}>
      <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 26, color: T.ink }}>Nivaar Admin</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {[["Total", stats.total, T.ink], ["Open", stats.open, T.amber], ["In Progress", stats.inProgress, T.blue], ["Resolved", stats.resolved, T.green]].map(([label, val, color]: any) => (
          <div key={label} className="rounded-[20px] p-4" style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
            <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 26, color }}>{val}</div>
            <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] overflow-hidden" style={{ height: 260 }}>
        <MapView height={260} center={markers[0] ? { lat: markers[0].lat, lng: markers[0].lng } : { lat: 12.9945, lng: 77.691 }} zoom={12} markers={markers} />
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="rounded-full px-3 py-1.5 text-[13px]" style={{ border: `1.5px solid ${T.line}` }}>
          <option value="">All statuses</option>
          {["Submitted", "Acknowledged", "Assigned", "In Progress", "Resolved"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)} className="rounded-full px-3 py-1.5 text-[13px]" style={{ border: `1.5px solid ${T.line}` }}>
          <option value="">All severities</option>
          {["High", "Medium", "Low"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="rounded-full px-3 py-1.5 text-[13px]" style={{ border: `1.5px solid ${T.line}` }}>
          <option value="">All categories</option>
          {Object.keys(stats.byCategory).map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="mt-4 rounded-[24px] overflow-hidden" style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
        {filtered.map((r: any, i: number) => (
          <Link key={r.id} href={`/admin/report/${r.id}`} className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: i < filtered.length - 1 ? `1px solid ${T.line}` : "none" }}>
            <div className="w-10 h-10 rounded-[14px] flex items-center justify-center text-lg shrink-0" style={{ background: chipBg(r.issue_type) }}>{ISSUE_EMOJI[r.issue_type]}</div>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{r.issue_type} <span style={{ color: T.inkSoft, fontWeight: 500 }}>· {r.report_number}</span></div>
              <div style={{ fontSize: 12, color: T.inkSoft }}>{r.landmark || r.address}</div>
            </div>
            <Pill tone={severityTone(r.severity)}>{r.severity}</Pill>
            <Pill tone="neutral">{r.status}</Pill>
          </Link>
        ))}
        {filtered.length === 0 && <div className="text-center py-10" style={{ color: T.inkSoft }}>No reports match these filters.</div>}
      </div>
    </div>
  );
}
