"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { PrimaryButton } from "@/components/ui/Buttons";
import { MapView } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";

const STATUSES = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Resolved"];

export default function AdminReportDetail({ params }: { params: { id: string } }) {
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch(`/api/reports/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setReport(data.report); setHistory(data.history);
      setNewStatus(data.report.status);
    }
  };
  useEffect(() => { load(); }, [params.id]);

  const updateStatus = async () => {
    setSaving(true); setError("");
    try {
      const res = await fetch(`/api/reports/${params.id}/status`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, note: note || undefined }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setNote("");
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!report) return <div className="min-h-screen flex items-center justify-center" style={{ background: T.bg, color: T.inkSoft }}>Loading…</div>;

  return (
    <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto" style={{ background: T.bg }}>
      <Link href="/admin" style={{ color: T.green, fontSize: 13, fontWeight: 700 }}>← Back to dashboard</Link>
      <div className="flex items-center gap-3 mt-4">
        <div className="w-14 h-14 rounded-[18px] flex items-center justify-center text-2xl" style={{ background: chipBg(report.issue_type) }}>{ISSUE_EMOJI[report.issue_type]}</div>
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 20, color: T.ink }}>{report.issue_type}</div>
          <div style={{ fontSize: 13, color: T.inkSoft }}>{report.report_number}</div>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <Pill tone={severityTone(report.severity)}>{report.severity}</Pill>
        <Pill tone="neutral">{report.status}</Pill>
        <Pill tone="blue">{report.department}</Pill>
        {report.is_demo && <Pill tone="amber">Demo</Pill>}
      </div>

      {report.image_url && <img src={report.image_url} className="w-full rounded-[24px] mt-4 object-cover" style={{ maxHeight: 260 }} alt="" />}
      {report.video_url && <video src={report.video_url} controls className="w-full rounded-[24px] mt-3" style={{ maxHeight: 260 }} />}
      {report.voice_transcript && (
        <div className="mt-3 rounded-[18px] p-3" style={{ background: T.purpleTint }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: "uppercase" }}>Voice note transcript</div>
          <div style={{ fontSize: 13, color: T.ink, fontStyle: "italic" }}>&quot;{report.voice_transcript}&quot;</div>
        </div>
      )}

      <div className="mt-4 rounded-[18px] p-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        <div style={{ fontSize: 12, color: T.inkSoft, fontWeight: 700, textTransform: "uppercase" }}>Description</div>
        <div style={{ fontSize: 13.5, color: T.ink, marginTop: 4 }}>{report.description}</div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 8 }}>AI confidence: {report.ai_confidence ?? "n/a"}% · {report.ai_explanation}</div>
      </div>

      <div className="mt-4 rounded-[24px] overflow-hidden" style={{ height: 180 }}>
        <MapView height={180} center={{ lat: report.latitude, lng: report.longitude }} zoom={15} markers={[{ lat: report.latitude, lng: report.longitude, color: T.rust, big: true }]} />
      </div>
      <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 4 }}>{report.address}</div>

      <div className="mt-6 rounded-[24px] p-4" style={{ background: T.card, border: `1.5px solid ${T.line}` }}>
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 16, color: T.ink }}>Update status</div>
        <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="w-full mt-3 rounded-[14px] p-3" style={{ border: `1.5px solid ${T.line}` }}>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note (e.g. which crew was assigned)" rows={2} className="w-full mt-2 rounded-[14px] p-3" style={{ border: `1.5px solid ${T.line}` }} />
        {error && <div style={{ color: T.rust, fontSize: 12.5, marginTop: 6 }}>{error}</div>}
        <div className="mt-3"><PrimaryButton onClick={updateStatus} disabled={saving}>{saving ? "Saving…" : "Save status update"}</PrimaryButton></div>
      </div>

      <div className="mt-6">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 16, color: T.ink }}>Status history</div>
        <div className="mt-2 space-y-2">
          {history.map((h) => (
            <div key={h.id} className="rounded-[14px] p-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: T.ink }}>{h.status}</div>
              <div style={{ fontSize: 11, color: T.sage, fontFamily: "var(--font-mono)" }}>{new Date(h.created_at).toLocaleString()}</div>
              {h.note && <div style={{ fontSize: 12.5, color: T.inkSoft, marginTop: 2 }}>{h.note}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
