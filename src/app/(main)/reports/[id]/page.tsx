"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ThumbsUp, ThumbsDown, Camera, Loader2 } from "lucide-react";
import { T, chipBg, severityTone } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { TopBar } from "@/components/ui/TopBar";
import { MapView } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";
import { ensureAuthenticated, uploadResolutionPhoto } from "@/lib/supabase/client";

const STAGES = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Resolved"];

export default function ReportDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const res = await fetch(`/api/reports/${params.id}`);
    if (res.ok) {
      const data = await res.json();
      setReport(data.report); setHistory(data.history); setResolutions(data.resolutions);
    }
  };
  useEffect(() => { load(); }, [params.id]);

  const handleAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const userId = await ensureAuthenticated();
      const url = await uploadResolutionPhoto(file, userId, file.name.split(".").pop() || "jpg");
      await fetch(`/api/reports/${params.id}/resolution`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url }),
      });
      await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (!report) return <div className="flex items-center justify-center min-h-full"><Loader2 className="animate-spin" color={T.green} /></div>;

  const stageIndex = STAGES.indexOf(report.status);
  const latestResolution = resolutions[resolutions.length - 1];

  return (
    <div className="flex flex-col min-h-full px-6 pt-5 pb-8">
      <TopBar onBack={() => router.push("/reports")} title="Track report" />
      <div className="mt-2 rounded-[24px] p-4 flex items-center gap-3" style={{ background: T.card, border: `1px solid ${T.line}` }}>
        {report.image_url ? <img src={report.image_url} className="w-12 h-12 rounded-[18px] object-cover" alt="" /> : <div className="w-12 h-12 rounded-[18px] flex items-center justify-center text-2xl" style={{ background: chipBg(report.issue_type) }}>{ISSUE_EMOJI[report.issue_type]}</div>}
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 17, color: T.ink }}>{report.issue_type}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft }}>{report.landmark} · {report.report_number}</div>
          <div className="flex gap-1.5 mt-1"><Pill tone={severityTone(report.severity)}>{report.severity} priority</Pill>{report.is_demo && <Pill tone="amber">Demo</Pill>}</div>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] overflow-hidden" style={{ height: 140 }}>
        <MapView height={140} center={{ lat: report.latitude, lng: report.longitude }} zoom={15} markers={[{ lat: report.latitude, lng: report.longitude, color: report.severity === "High" ? T.rust : T.amber, big: true }]} />
      </div>

      <div className="mt-4 rounded-[24px] p-4" style={{ background: T.greenTint }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.greenDeep, textTransform: "uppercase" }}>Complaint</div>
        <div style={{ fontSize: 13.5, color: T.ink, marginTop: 4, lineHeight: 1.5 }}>{report.description}</div>
      </div>

      <div className="mt-6 relative pl-2">
        {STAGES.map((s, i) => {
          const done = i <= stageIndex;
          const entry = history.find((h) => h.status === s);
          return (
            <div key={s} className="flex gap-3 pb-6 last:pb-0 relative">
              {i < STAGES.length - 1 && <div className="absolute left-[9px] top-5 bottom-0 w-[1.5px]" style={{ background: done ? T.green : T.line }} />}
              <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: done ? T.green : T.card, border: `1.5px solid ${done ? T.green : T.line}` }}>{done && <Check size={11} color="#fff" strokeWidth={3} />}</div>
              <div>
                <div style={{ fontWeight: done ? 600 : 400, fontSize: 14, color: done ? T.ink : T.inkSoft }}>{s}</div>
                {entry && <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.sage }}>{new Date(entry.created_at).toLocaleString()}</div>}
                {entry?.note && <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{entry.note}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {report.status === "Resolved" && (
        <div className="mt-4 rounded-[24px] p-4" style={{ background: T.greenTint }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: T.greenDeep }}>🎉 This issue was marked as fixed.</div>
          {latestResolution ? (
            <>
              <img src={latestResolution.image_url} className="w-full rounded-[18px] mt-3 object-cover" style={{ height: 140 }} alt="after" />
              {latestResolution.ai_verification && (
                <div className="mt-3 rounded-[14px] p-3" style={{ background: "#fff" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: T.purple, textTransform: "uppercase" }}>AI assessment</div>
                  <div className="flex items-center gap-2 mt-1">
                    {latestResolution.ai_verification.looksResolved ? <ThumbsUp size={14} color={T.green} /> : <ThumbsDown size={14} color={T.rust} />}
                    <span style={{ fontSize: 13, color: T.ink }}>{latestResolution.ai_verification.note} ({latestResolution.ai_verification.confidence}% confidence)</span>
                  </div>
                  <div style={{ fontSize: 10.5, color: T.inkSoft, marginTop: 4 }}>This is an AI best-guess, not a guarantee.</div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 text-[13px]" style={{ color: T.inkSoft }}>Add a photo so we (and Nivaar's AI) can check it looks fixed.</div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full mt-3 rounded-[18px] py-2.5 flex items-center justify-center gap-1.5 text-[13px] font-semibold" style={{ background: T.green, color: "#fff" }}>
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />} Add after photo
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAfterPhoto} />
            </>
          )}
        </div>
      )}
    </div>
  );
}
