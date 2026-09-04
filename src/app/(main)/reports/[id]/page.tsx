"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ThumbsUp, ThumbsDown, Camera, Loader2, Share2, Clock } from "lucide-react";
import { T, chipBg, severityTone, tintShadow } from "@/components/tokens";
import { Pill } from "@/components/ui/Pill";
import { Stepper } from "@/components/ui/Stepper";
import { MapView } from "@/components/MapView";
import { ISSUE_EMOJI } from "@/lib/routing";
import { ensureAuthenticated, uploadResolutionPhoto } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { compressImage } from "@/lib/imageCompress";
import { getJson, postJson } from "@/lib/safeFetch";
import { useLocalizedPlace } from "@/lib/useLocalizedPlace";

const STAGES = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Resolved"];
const STAGE_COLOR: Record<string, string> = {
  Submitted: T.green, Acknowledged: T.green, Assigned: T.purple, "In Progress": T.amber, Resolved: T.sage,
};

export default function ReportDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { t, tIssue, tStatus } = useLanguage();
  const [report, setReport] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [resolutions, setResolutions] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const data = await getJson(`/api/reports/${params.id}`);
      setReport(data.report); setHistory(data.history); setResolutions(data.resolutions);
    } catch (err) {
      console.error("[report detail] load failed:", err);
    }
  };
  useEffect(() => { load(); }, [params.id]);

  const handleAfterPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const userId = await ensureAuthenticated();
      const compressed = await compressImage(file);
      const url = await uploadResolutionPhoto(compressed.file, userId, "jpg");
      await postJson(`/api/reports/${params.id}/resolution`, { imageUrl: url });
      await load();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try { await navigator.share({ title: `Nivaar report ${report.report_number}`, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
    }
  };

  const place = useLocalizedPlace(report?.latitude, report?.longitude, report?.landmark, report?.address);

  if (!report) return <div className="flex items-center justify-center min-h-full"><Loader2 className="animate-spin" color={T.purple} /></div>;

  const stageIndex = STAGES.indexOf(report.status);
  const latestResolution = resolutions[resolutions.length - 1];
  const isResolved = report.status === "Resolved";

  return (
    <div className="flex flex-col min-h-full pb-8">
      <div className="flex items-center justify-between px-5 pt-5 pb-1">
        <button onClick={() => router.push("/reports")} className="w-9 h-9 rounded-full flex items-center justify-center -ml-2" style={{ color: T.ink }}>←</button>
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 17, color: T.ink }}>{t("track_title")}</div>
        <button onClick={handleShare} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ color: T.purpleDeep }}><Share2 size={17} /></button>
      </div>
      <Stepper active={4} />

      <div className="px-6 text-center mt-2 mb-4">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 18, color: T.ink }}>
          {isResolved ? `${t("track_resolved_banner")} 🎉` : `${t("track_on_the_way")} 🎉`}
        </div>
        <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{t("track_report_id")}</div>
        <div className="inline-block mt-1.5 px-4 py-1.5 rounded-full" style={{ background: T.purple, boxShadow: tintShadow(T.purpleDeep) }}>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "#fff", fontWeight: 700 }}>{report.report_number}</span>
        </div>
      </div>

      <div className="px-6">
        <div className="rounded-[20px] p-4 flex items-center gap-3 mb-4" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.35)" }}>
          {report.image_url ? <img src={report.image_url} className="w-12 h-12 rounded-[16px] object-cover" alt="" /> : <div className="w-12 h-12 rounded-[16px] flex items-center justify-center text-2xl" style={{ background: chipBg(report.issue_type) }}>{ISSUE_EMOJI[report.issue_type]}</div>}
          <div>
            <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 15.5, color: T.ink }}>{tIssue(report.issue_type)}</div>
            <div style={{ fontSize: 12, color: T.inkSoft }}>{place.area}</div>
            <div className="flex gap-1.5 mt-1"><Pill tone={severityTone(report.severity)}>{report.severity}</Pill>{report.is_demo && <Pill tone="amber">Demo</Pill>}</div>
          </div>
        </div>

        <div className="space-y-0 mb-5">
          {STAGES.map((s, i) => {
            const done = i < stageIndex;
            const current = i === stageIndex;
            const future = i > stageIndex;
            const entry = history.find((h) => h.status === s);
            const color = done ? T.green : current ? STAGE_COLOR[s] : T.sage;
            return (
              <div key={s} className="flex gap-3 pb-5 last:pb-0 relative">
                {i < STAGES.length - 1 && <div className="absolute left-[11px] top-6 bottom-0 w-[2px]" style={{ background: done ? T.green : T.line }} />}
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10" style={{ background: done ? T.green : current ? color : T.card, border: future ? `2px solid ${T.line}` : "none" }}>
                  {done ? <Check size={13} color="#fff" strokeWidth={3} /> : current ? <Clock size={12} color="#fff" /> : null}
                </div>
                <div>
                  <div style={{ fontWeight: done || current ? 700 : 500, fontSize: 14, color: future ? T.sage : T.ink }}>{tStatus(s)}</div>
                  {entry ? (
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: T.sage }}>{new Date(entry.created_at).toLocaleString()}</div>
                  ) : future ? (
                    <div style={{ fontSize: 11.5, color: T.sage }}>—</div>
                  ) : null}
                  {entry?.note && <div style={{ fontSize: 12, color: T.inkSoft, marginTop: 2 }}>{entry.note}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-[20px] overflow-hidden mb-3" style={{ height: 150 }}>
          <MapView height={150} center={{ lat: report.latitude, lng: report.longitude }} zoom={15} markers={[{ lat: report.latitude, lng: report.longitude, color: T.rust, big: true }]} />
        </div>
        <div className="rounded-[18px] p-4 flex items-center justify-between mb-5" style={{ background: T.card, boxShadow: "0 4px 14px -8px rgba(139,127,209,0.3)" }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: T.ink }}>{place.full}</div>
          <a href={`https://www.openstreetmap.org/?mlat=${report.latitude}&mlon=${report.longitude}#map=17/${report.latitude}/${report.longitude}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: T.purpleDeep }}>{t("track_view_map")}</a>
        </div>

        {isResolved && (
          <div className="rounded-[20px] p-4" style={{ background: T.greenTint }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: T.greenDeep }}>🎉 {t("track_resolved_banner")}</div>
            {latestResolution ? (
              <>
                <img src={latestResolution.image_url} className="w-full rounded-[16px] mt-3 object-cover" style={{ height: 140 }} alt="after" />
                {latestResolution.ai_verification && (
                  <div className="mt-3 rounded-[14px] p-3" style={{ background: "#fff" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: T.purpleDeep, textTransform: "uppercase" }}>{t("track_ai_assessment")}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {latestResolution.ai_verification.looksResolved ? <ThumbsUp size={14} color={T.green} /> : <ThumbsDown size={14} color={T.rust} />}
                      <span style={{ fontSize: 13, color: T.ink }}>{latestResolution.ai_verification.note} ({latestResolution.ai_verification.confidence}%)</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mt-1 text-[13px]" style={{ color: T.inkSoft }}>Add a photo so we (and Nivaar&apos;s AI) can check it looks fixed.</div>
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="w-full mt-3 rounded-[16px] py-2.5 flex items-center justify-center gap-1.5 text-[13px] font-bold" style={{ background: T.purple, color: "#fff" }}>
                  {uploading ? <Loader2 className="animate-spin" size={14} /> : <Camera size={14} />} {t("track_add_after_photo")}
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAfterPhoto} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
