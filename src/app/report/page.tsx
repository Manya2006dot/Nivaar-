"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Image as ImageIcon, Check, X, Plus, Mic, ChevronRight,
  Sparkles, Keyboard, AlertTriangle, RefreshCw, Loader2, Users, Send,
  Edit3, Flame, Bot, Play, Pause, Trash2, Megaphone,
} from "lucide-react";
import { T, categoryColor, chipBg, tintShadow } from "@/components/tokens";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Buttons";
import { Pill } from "@/components/ui/Pill";
import { TopBar } from "@/components/ui/TopBar";
import { Stepper } from "@/components/ui/Stepper";
import { ISSUE_TYPES, ISSUE_EMOJI, resolveAuthority } from "@/lib/routing";
import { createClient, ensureAuthenticated, uploadEvidence } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { compressImage } from "@/lib/imageCompress";
import { postJson, postForm, parseJsonResponse } from "@/lib/safeFetch";

type Step =
  | "capture" | "ai-detecting" | "ai-failed" | "manual-describe"
  | "severity" | "locating" | "duplicate"
  | "review" | "submitting" | "submitted";

interface Classification {
  isCivicIssue: boolean; issueType: string; confidence: number;
  severity: "Low" | "Medium" | "High"; explanation: string; description: string;
}
interface LocationData { lat: number; lng: number; area: string; cityLine: string; }
interface Photo { file: File; dataUrl: string; }

const LOW_CONFIDENCE_THRESHOLD = 65;
const DEFAULT_LOC = { lat: 12.9945, lng: 77.691 };
const MAX_PHOTOS = 5;

async function reverseGeocode(lat: number, lng: number): Promise<{ area: string; cityLine: string }> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16`);
  if (!res.ok) throw new Error("reverse geocode failed");
  const data = await res.json();
  const a = data.address || {};
  const area = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || "Your area";
  const city = a.city || a.town || a.state_district || "";
  const state = a.state || "";
  return { area, cityLine: [city, state].filter(Boolean).join(", ") || data.display_name || "" };
}

export default function ReportFlow() {
  const router = useRouter();
  const { t, tIssue } = useLanguage();
  const [step, setStep] = useState<Step>("capture");

  // --- capture: photos ---
  const [photos, setPhotos] = useState<Photo[]>([]);

  // --- capture: voice ---
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceDurationSec, setVoiceDurationSec] = useState(0);

  // --- AI + review ---
  const [classification, setClassification] = useState<Classification | null>(null);
  const [severityChosen, setSeverityChosen] = useState<"Low" | "Medium" | "High">("Medium");
  const [location, setLocation] = useState<LocationData | null>(null);
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [finalDescription, setFinalDescription] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => { if (voiceUrl) URL.revokeObjectURL(voiceUrl); };
  }, [voiceUrl]);

  // ---------------- Capture: photos ----------------
  // Every selected photo is compressed/resized client-side immediately —
  // this is the actual fix for the mobile "Request Entity Too Large" bug.
  // See src/lib/imageCompress.ts for why.
  const addPhotos = async (fileList: FileList | null) => {
    if (!fileList) return;
    const remaining = MAX_PHOTOS - photos.length;
    const files = Array.from(fileList).slice(0, remaining);
    const added: Photo[] = [];
    for (const file of files) {
      const compressed = await compressImage(file);
      added.push(compressed);
    }
    setPhotos((p) => [...p, ...added]);
  };
  const removePhoto = (idx: number) => setPhotos((p) => p.filter((_, i) => i !== idx));

  // ---------------- Capture: voice ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setVoiceBlob(blob);
        setVoiceUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        setTranscribing(true);
        try {
          const form = new FormData();
          form.append("audio", blob, "voice-note.webm");
          const data = await postForm("/api/ai/transcribe", form);
          setVoiceTranscript(data.transcript || "");
        } catch {
          // Non-fatal.
        } finally {
          setTranscribing(false);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setVoiceDurationSec(0);
      recordTimerRef.current = setInterval(() => setVoiceDurationSec((s) => s + 1), 1000);
    } catch {
      setError(t("error_mic_denied"));
    }
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };
  const togglePlay = () => {
    if (!audioPlayerRef.current) return;
    if (playing) { audioPlayerRef.current.pause(); setPlaying(false); }
    else { audioPlayerRef.current.play(); setPlaying(true); }
  };
  const deleteVoice = () => {
    if (voiceUrl) URL.revokeObjectURL(voiceUrl);
    setVoiceBlob(null); setVoiceUrl(null); setVoiceTranscript(""); setVoiceDurationSec(0); setPlaying(false);
  };

  // ---------------- Capture -> AI detection ----------------
  const runCapture = async () => {
    if (photos.length === 0) return;
    setStep("ai-detecting");
    setAiDone(false);
    setError(null);
    try {
      await ensureAuthenticated();
      const primary = photos[0];
      // photos[0].dataUrl is already the compressed version from addPhotos —
      // reuse it directly instead of re-reading the file.
      const base64 = primary.dataUrl.split(",")[1];
      const result: Classification = await postJson("/api/ai/classify", {
        imageBase64: base64,
        mediaType: primary.file.type || "image/jpeg",
      });
      setClassification(result);
      setSeverityChosen(result.severity);
      setAiDone(true);
    } catch (err: any) {
      setError(err.message);
      setStep("ai-failed");
    }
  };

  const handleManualDescribe = (text: string) => {
    setClassification({
      isCivicIssue: true, issueType: "Other", confidence: 0, severity: "Medium",
      explanation: "Reported directly by the citizen.", description: text,
    });
    setSeverityChosen("Medium");
    setAiDone(true);
    setStep("ai-detecting");
  };

  // ---------------- AI detection -> severity -> location -> duplicate -> review ----------------
  const proceedToLocation = () => {
    setStep("locating");
    if (!("geolocation" in navigator)) {
      setLocation({ ...DEFAULT_LOC, area: "Mahadevapura", cityLine: "Bengaluru, Karnataka" });
      checkDuplicates({ ...DEFAULT_LOC, area: "Mahadevapura", cityLine: "Bengaluru, Karnataka" });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        let place = { area: "Your location", cityLine: "" };
        try { place = await reverseGeocode(lat, lng); } catch {}
        const loc = { lat, lng, ...place };
        setLocation(loc);
        checkDuplicates(loc);
      },
      () => {
        const loc = { ...DEFAULT_LOC, area: "Mahadevapura", cityLine: "Bengaluru, Karnataka" };
        setLocation(loc);
        checkDuplicates(loc);
      },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  const checkDuplicates = async (loc: LocationData) => {
    if (!classification) return;
    try {
      const data = await postJson("/api/reports/duplicates", { issueType: classification.issueType, latitude: loc.lat, longitude: loc.lng });
      if (data.matches?.length) {
        setDuplicates(data.matches);
        setStep("duplicate");
      } else {
        goToReview(loc);
      }
    } catch {
      goToReview(loc);
    }
  };

  const joinDuplicate = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("join_report", { p_report_id: reportId });
      if (error) throw error;
      setSubmittedId(reportId);
      setStep("submitted");
    } catch (err: any) {
      setError(err.message);
    }
  };

  const goToReview = async (loc: LocationData) => {
    setStep("review");
    if (!classification) return;
    try {
      const data = await postJson("/api/ai/compose", {
        issueType: classification.issueType, severity: severityChosen,
        imageDescription: classification.description, voiceTranscript: voiceTranscript || undefined,
        location: `${loc.area}, ${loc.cityLine}`,
      });
      setFinalDescription(data.description);
    } catch {
      setFinalDescription(classification.description.replace("{location}", `${loc.area}, ${loc.cityLine}`));
    }
  };

  // ---------------- Submit ----------------
  const submitReport = async () => {
    if (!classification || !location) return;
    setStep("submitting");
    setError(null);
    try {
      const userId = await ensureAuthenticated();
      // All selected photos are genuinely uploaded to Storage. Today's
      // `reports` table has a single image_url column (unchanged schema),
      // so the first photo becomes the report's primary evidence photo —
      // identical to the existing, working submission contract.
      const uploadedUrls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        setUploadProgress({ current: i + 1, total: photos.length });
        const url = await uploadEvidence(photos[i].file, userId, "image", (photos[i].file.name.split(".").pop() || "jpg"));
        uploadedUrls.push(url);
      }
      setUploadProgress(null);
      let uploadedVoiceUrl: string | null = null;
      if (voiceBlob) uploadedVoiceUrl = await uploadEvidence(voiceBlob, userId, "voice", "webm");

      const data = await postJson("/api/reports", {
        imageUrl: uploadedUrls[0] ?? null, videoUrl: null, voiceUrl: uploadedVoiceUrl, voiceTranscript: voiceTranscript || null,
        issueType: classification.issueType, aiConfidence: classification.confidence || null,
        severity: severityChosen, aiExplanation: classification.explanation,
        description: finalDescription || classification.description,
        latitude: location.lat, longitude: location.lng,
        address: `${location.area}, ${location.cityLine}`, landmark: location.area,
        isDemo: false,
      });
      setSubmittedId(data.report.id);
      setStep("submitted");
    } catch (err: any) {
      setError(err.message || t("error_generic"));
      setStep("review");
    }
  };

  const issue = classification;
  const emoji = issue ? ISSUE_EMOJI[issue.issueType] || "❗" : "❗";
  const severityColor = (s: string) => (s === "High" ? T.rust : s === "Medium" ? T.amber : T.green);

  // ============================= RENDER =============================

  if (step === "capture") {
    return (
      <div className="flex flex-col min-h-full pb-8">
        <TopBar onBack={() => router.push("/home")} title="" />
        <div className="px-6 -mt-2">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 20, color: T.ink, textAlign: "center" }}>{t("capture_title")}</div>
        </div>
        <Stepper active={1} />

        <div className="px-6 mt-2">
          {photos.length === 0 ? (
            <button onClick={() => fileRef.current?.click()} className="w-full rounded-[24px] flex flex-col items-center justify-center py-10" style={{ background: T.purpleTint, border: `2px dashed ${T.purple}55` }}>
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-3" style={{ background: T.purple, boxShadow: tintShadow(T.purpleDeep) }}>
                <Camera size={28} color="#fff" />
              </div>
              <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 16, color: T.ink }}>{t("capture_take_photo")}</div>
              <div style={{ fontSize: 12.5, color: T.inkSoft }}>{t("capture_capture_clearly")}</div>
            </button>
          ) : (
            <img src={photos[0].dataUrl} alt="" className="w-full rounded-[24px] object-cover" style={{ height: 190 }} />
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} />

          <div className="grid grid-cols-2 gap-3 mt-3">
            <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-[16px] py-3 font-bold text-[13.5px]" style={{ background: T.purpleTint, color: T.purpleDeep }}><Camera size={16} /> {t("capture_camera")}</button>
            <button onClick={() => fileRef.current?.click()} className="flex items-center justify-center gap-2 rounded-[16px] py-3 font-bold text-[13.5px]" style={{ background: T.blueTint, color: T.blueDeep }}><ImageIcon size={16} /> {t("capture_gallery")}</button>
          </div>

          <div className="flex items-center justify-between mt-5 mb-2">
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{t("capture_add_more")}</span>
            <span style={{ fontSize: 12.5, fontWeight: 800, color: T.purpleDeep }}>{photos.length}/{MAX_PHOTOS}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {photos.map((p, i) => (
              <div key={i} className="relative w-14 h-14">
                <img src={p.dataUrl} alt="" className="w-14 h-14 rounded-[14px] object-cover" />
                <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.ink }}><X size={11} color="#fff" /></button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-[14px] flex items-center justify-center" style={{ background: T.purpleTint, border: `2px dashed ${T.purple}66` }}>
                <Plus size={18} color={T.purpleDeep} />
              </button>
            )}
          </div>

          <div className="mt-6">
            <div style={{ fontSize: 13, fontWeight: 700, color: T.ink, marginBottom: 6 }}>{t("capture_tell_us_more")}</div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: T.purpleDeep }}>{t("capture_speak_in_language")}</div>

            {voiceUrl && <audio ref={audioPlayerRef} src={voiceUrl} onEnded={() => setPlaying(false)} className="hidden" />}

            <div className="flex items-center gap-3 mt-3 rounded-[18px] p-3" style={{ background: T.card, boxShadow: "0 4px 14px -8px rgba(139,127,209,0.3)" }}>
              {!voiceUrl ? (
                <button onClick={recording ? stopRecording : startRecording} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 relative" style={{ background: recording ? T.rust : T.purple }}>
                  {recording && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: T.rust, opacity: 0.35 }} />}
                  <Mic size={18} color="#fff" />
                </button>
              ) : (
                <button onClick={togglePlay} className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: T.green }}>
                  {playing ? <Pause size={18} color="#fff" /> : <Play size={18} color="#fff" />}
                </button>
              )}
              <div className="flex-1 flex items-center gap-[3px] h-8">
                {recording ? (
                  Array.from({ length: 20 }).map((_, i) => (
                    <span key={i} className="rounded-full" style={{ width: 3, height: `${8 + ((i * 37) % 22)}px`, background: [T.purple, T.rust, T.amber, T.blue, T.green][i % 5], animation: "nivaar-wave 0.9s ease-in-out infinite", animationDelay: `${i * 0.05}s` }} />
                  ))
                ) : voiceTranscript || transcribing ? (
                  <span style={{ fontSize: 12, color: T.inkSoft }}>{transcribing ? t("capture_transcribing") : `"${voiceTranscript}"`}</span>
                ) : voiceUrl ? (
                  <span style={{ fontSize: 12, color: T.sage }}>{t("voice_play")}</span>
                ) : (
                  <span style={{ fontSize: 12, color: T.sage }}>{t("capture_tap_mic")}</span>
                )}
              </div>
              <span style={{ fontSize: 11, color: T.inkSoft, fontFamily: "var(--font-mono)" }}>{String(Math.floor(voiceDurationSec / 60)).padStart(2, "0")}:{String(voiceDurationSec % 60).padStart(2, "0")}</span>
              {voiceUrl && !recording && (
                <button onClick={deleteVoice} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: T.rustTint }}><Trash2 size={14} color={T.rustDeep} /></button>
              )}
            </div>
            <style>{`@keyframes nivaar-wave { 0%,100% { transform: scaleY(0.4); } 50% { transform: scaleY(1); } }`}</style>
          </div>

          <div className="mt-4 rounded-[18px] p-3 flex items-start gap-2.5" style={{ background: T.amberTint }}>
            <Megaphone size={16} color={T.amberDeep} className="shrink-0 mt-0.5" />
            <span style={{ fontSize: 12, color: T.inkSoft }}>{t("capture_tip")}</span>
          </div>

          {error && <div className="mt-3 text-[12.5px]" style={{ color: T.rust }}>{error}</div>}

          <div className="mt-6">
            <PrimaryButton onClick={runCapture} disabled={photos.length === 0} icon={<ChevronRight size={18} />}>{t("capture_continue")}</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (step === "ai-detecting") {
    return (
      <div className="flex flex-col min-h-full pb-8">
        <TopBar onBack={() => router.push("/home")} title="AI Detection" />
        <div className="px-6">
          <div className="rounded-[24px] p-4 flex items-center gap-3 mb-4" style={{ background: `linear-gradient(135deg, ${T.purple}, ${T.purpleDeep})` }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.25)" }}><Bot size={18} color="#fff" /></div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 800, color: "#fff" }}>{aiDone ? t("ai_finished") : t("ai_analyzing")}</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)" }}>{aiDone ? t("ai_here_is_what_found") : t("ai_please_wait")}</div>
            </div>
          </div>

          {photos[0] && <img src={photos[0].dataUrl} alt="" className="w-full rounded-[24px] object-cover mb-4" style={{ height: 220 }} />}

          {!aiDone ? (
            <div className="flex flex-col items-center py-6"><Loader2 className="animate-spin" size={26} color={T.purple} /></div>
          ) : issue ? (
            <>
              <div className="rounded-[24px] p-4" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.35)" }}>
                <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 18, color: categoryColor(issue.issueType) }}>{tIssue(issue.issueType)} {t("ai_detected_suffix")}</div>
                <div className="flex items-center justify-between mt-3">
                  <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 700 }}>{t("ai_confidence")}</span>
                  <Pill tone="purple">{issue.confidence}%</Pill>
                </div>
                <div className="w-full h-2 rounded-full mt-1.5" style={{ background: T.line }}>
                  <div className="h-2 rounded-full" style={{ width: `${issue.confidence}%`, background: T.purple }} />
                </div>
              </div>

              <div className="flex items-end gap-2 mt-4">
                <div className="text-3xl">🤖</div>
                <div className="rounded-[16px] rounded-bl-none px-3.5 py-2.5" style={{ background: T.purpleTint }}>
                  <span style={{ fontSize: 12.5, color: T.ink }}>{issue.confidence < LOW_CONFIDENCE_THRESHOLD ? t("ai_not_sure") : `${t("ai_looks_like_prefix")} ${tIssue(issue.issueType).toLowerCase()}. ${t("ai_here_is_what_i_found")}`}</span>
                </div>
              </div>

              {issue.confidence < LOW_CONFIDENCE_THRESHOLD ? (
                <div className="mt-5 space-y-2">
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{t("ai_pick_category")}</div>
                  <div className="flex flex-wrap gap-2">
                    {ISSUE_TYPES.map((tp) => (
                      <button key={tp} onClick={() => setClassification({ ...issue, issueType: tp, confidence: 60 })} className="px-3 py-1.5 rounded-full text-[12px] font-bold" style={{ background: issue.issueType === tp ? T.purple : T.purpleTint, color: issue.issueType === tp ? "#fff" : T.purpleDeep }}>{tIssue(tp)}</button>
                    ))}
                  </div>
                  <div className="mt-4"><PrimaryButton onClick={() => setStep("severity")} icon={<ChevronRight size={18} />}>{t("ai_continue")}</PrimaryButton></div>
                </div>
              ) : (
                <div className="mt-5"><PrimaryButton onClick={() => setStep("severity")} icon={<ChevronRight size={18} />}>{t("ai_continue_looks_right")}</PrimaryButton></div>
              )}
            </>
          ) : null}
        </div>
      </div>
    );
  }

  if (step === "ai-failed") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-12 pb-8 items-center justify-between">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: T.rustTint }}><AlertTriangle size={26} color={T.rustDeep} /></div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 20, color: T.ink }}>{t("error_ai_unavailable")}</div>
          <div className="mt-2 text-[13.5px] max-w-[280px] mx-auto" style={{ color: T.inkSoft }}>{error || t("error_generic")}</div>
        </div>
        <div className="w-full space-y-3"><PrimaryButton onClick={runCapture} icon={<RefreshCw size={17} />}>{t("retry")}</PrimaryButton><SecondaryButton onClick={() => setStep("manual-describe")}>{t("describe_manually")}</SecondaryButton></div>
      </div>
    );
  }

  if (step === "manual-describe") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-5 pb-8 justify-between">
        <div>
          <TopBar onBack={() => setStep("capture")} />
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 20, color: T.ink }}>Tell us what happened</div>
          <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={6} placeholder="e.g. There's a deep pothole outside my building..." className="w-full mt-5 rounded-[20px] p-4 text-[14px] outline-none" style={{ background: T.card, border: `1.5px solid ${T.line}`, color: T.ink }} />
        </div>
        <PrimaryButton disabled={manualText.trim().length < 5} onClick={() => handleManualDescribe(manualText.trim())} icon={<ChevronRight size={18} />}>{t("capture_continue")}</PrimaryButton>
      </div>
    );
  }

  if (step === "severity" && issue) {
    const opts = [
      { key: "High" as const, label: t("severity_high"), sub: t("severity_high_desc"), color: T.rust, e: "🔥" },
      { key: "Medium" as const, label: t("severity_medium"), sub: t("severity_medium_desc"), color: T.amber, e: "⚡" },
      { key: "Low" as const, label: t("severity_low"), sub: t("severity_low_desc"), color: T.green, e: "🌱" },
    ];
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 22, color: T.ink }}>{t("severity_title")}</div>
          <div className="mt-3 rounded-[20px] p-3.5 flex gap-2.5" style={{ background: `${T.purple}12` }}>
            <Sparkles size={16} color={T.purple} className="shrink-0 mt-0.5" />
            <div style={{ fontSize: 13, color: T.inkSoft }}>{issue.explanation}</div>
          </div>
          <div className="mt-6 space-y-3">
            {opts.map((o) => { const active = severityChosen === o.key; return (
              <button key={o.key} onClick={() => setSeverityChosen(o.key)} className="w-full flex items-center gap-3 rounded-[20px] px-4 py-4 text-left transition active:scale-[0.97]" style={{ background: active ? o.color + "1F" : T.card, boxShadow: active ? `0 6px 16px -6px ${o.color}70` : "0 4px 14px -8px rgba(139,127,209,0.25)" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: o.color + "22" }}>{o.e}</div>
                <div className="flex-1"><div style={{ fontWeight: 800, fontSize: 15.5, color: active ? o.color : T.ink }}>{o.label}</div><div style={{ fontSize: 12.5, color: T.inkSoft }}>{o.sub}</div></div>
                {o.key === issue.severity && <Pill tone="purple">{t("severity_ai_pick")}</Pill>}
              </button>
            ); })}
          </div>
        </div>
        <PrimaryButton onClick={proceedToLocation} icon={<ChevronRight size={18} />}>{t("severity_continue")}</PrimaryButton>
      </div>
    );
  }

  if (step === "locating") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-16 items-center justify-center">
        <Loader2 className="animate-spin" size={26} color={T.purple} />
        <div className="mt-3 text-[13.5px]" style={{ color: T.inkSoft }}>{t("location_finding")}</div>
      </div>
    );
  }

  if (step === "duplicate") {
    const top = duplicates[0]?.report;
    if (!top) return null;
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 19, color: T.ink }}>🔎 {t("duplicate_title")}</div>
          <div className="mt-1.5 text-[13.5px]" style={{ color: T.inkSoft }}>{Math.round(duplicates[0].distance)}m away, same category.</div>
          <div className="mt-5 rounded-[20px] p-4" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.35)" }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[16px] flex items-center justify-center text-xl" style={{ background: chipBg(top.issue_type) }}>{ISSUE_EMOJI[top.issue_type]}</div>
              <div className="flex-1"><div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{tIssue(top.issue_type)}</div><div style={{ fontSize: 12, color: T.inkSoft }}>{top.landmark}</div></div>
            </div>
            <div className="flex items-center gap-1.5 mt-3" style={{ color: T.purpleDeep, fontSize: 12.5, fontWeight: 700 }}><Users size={14} /> {top.affected_count} {t("duplicate_citizens")}</div>
          </div>
        </div>
        <div className="space-y-3">
          <PrimaryButton onClick={() => joinDuplicate(top.id)} icon={<Users size={17} />}>{t("duplicate_join")}</PrimaryButton>
          <SecondaryButton onClick={() => location && goToReview(location)}>{t("duplicate_separate")}</SecondaryButton>
        </div>
      </div>
    );
  }

  if (step === "review" && issue && location) {
    const authority = resolveAuthority(issue.issueType);
    return (
      <div className="flex flex-col min-h-full pb-8">
        <TopBar onBack={() => router.push("/home")} title="" />
        <div className="px-6 -mt-2"><div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 20, color: T.ink, textAlign: "center" }}>{t("review_title")}</div></div>
        <Stepper active={2} />

        <div className="px-6">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 17, color: T.ink }}>{t("review_here_is_what")}</div>
          <div style={{ fontSize: 12.5, color: T.inkSoft, marginBottom: 12 }}>{t("review_subtitle")}</div>

          <div className="flex gap-2 flex-wrap mb-4">
            {photos.map((p, i) => (
              <div key={i} className="relative w-14 h-14">
                <img src={p.dataUrl} className="w-14 h-14 rounded-[14px] object-cover" alt="" />
                <button onClick={() => removePhoto(i)} className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.ink }}><X size={11} color="#fff" /></button>
              </div>
            ))}
            {photos.length < MAX_PHOTOS && (
              <button onClick={() => fileRef.current?.click()} className="w-14 h-14 rounded-[14px] flex items-center justify-center" style={{ background: T.purpleTint, border: `2px dashed ${T.purple}66` }}><Plus size={18} color={T.purpleDeep} /></button>
            )}
          </div>

          <div className="rounded-[20px] overflow-hidden" style={{ background: T.card, boxShadow: "0 6px 18px -10px rgba(139,127,209,0.35)" }}>
            {[
              [t("review_issue"), `${emoji} ${tIssue(issue.issueType)}`],
              [t("review_location"), `${location.area}, ${location.cityLine}`],
              [t("review_severity"), opts_label(severityChosen, t)],
              [t("review_authority"), authority.authority],
            ].map(([k, v], i, arr) => (
              <div key={k as string} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <span style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 700 }}>{k}</span>
                <span style={{ fontSize: 13, color: T.ink, fontWeight: 700, textAlign: "right", maxWidth: 200 }}>{v}</span>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 12.5, fontWeight: 700, color: T.ink }}>{t("review_description")}</span>
              <button onClick={() => setEditingDescription((e) => !e)} className="flex items-center gap-1" style={{ color: T.purpleDeep, fontSize: 12, fontWeight: 700 }}><Edit3 size={12} /> {t("review_edit")}</button>
            </div>
            {editingDescription ? (
              <textarea value={finalDescription} onChange={(e) => setFinalDescription(e.target.value)} rows={5} className="w-full rounded-[18px] p-4 text-[13.5px] outline-none" style={{ background: T.greenTint, border: `1.5px solid ${T.green}55`, color: T.ink }} />
            ) : (
              <div className="rounded-[18px] p-4" style={{ background: T.greenTint, fontSize: 13.5, color: T.ink, lineHeight: 1.55 }}>{finalDescription || "…"}</div>
            )}
          </div>

          {error && <div className="mt-3 text-[12.5px]" style={{ color: T.rust }}>{error}</div>}

          <div className="mt-6">
            <PrimaryButton onClick={submitReport} icon={<Send size={17} />} disabled={!finalDescription} variant="yellow">{t("review_submit")}</PrimaryButton>
          </div>
        </div>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="flex flex-col min-h-full pb-8">
        <Stepper active={3} />
        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <Loader2 className="animate-spin" size={30} color={T.purple} />
          <div className="mt-4 text-center" style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 18, color: T.ink }}>
            {uploadProgress ? `${t("submitting_uploading")} ${uploadProgress.current}/${uploadProgress.total}…` : t("submitting_sending")}
          </div>
        </div>
      </div>
    );
  }

  if (step === "submitted" && submittedId) {
    return (
      <div className="flex flex-col min-h-full px-6 pt-14 pb-8 items-center justify-between">
        <div className="w-full text-center">
          <div className="text-5xl mb-4">🎉</div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 22, color: T.ink }}>{t("submitted_title")}</div>
          <div className="mt-2 text-[13.5px]" style={{ color: T.inkSoft }}>{t("submitted_subtitle")}</div>
        </div>
        <div className="w-full space-y-3">
          <PrimaryButton onClick={() => router.push(`/reports/${submittedId}`)} icon={<ChevronRight size={18} />}>{t("submitted_track")}</PrimaryButton>
          <SecondaryButton onClick={() => router.push("/home")}>{t("submitted_another")}</SecondaryButton>
        </div>
      </div>
    );
  }

  return null;
}

function opts_label(severity: string, t: (k: any) => string) {
  if (severity === "High") return t("severity_high");
  if (severity === "Medium") return t("severity_medium");
  return t("severity_low");
}
