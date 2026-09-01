"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Camera, Image as ImageIcon, Check, RotateCcw, Mic, MapPin, ChevronRight,
  Sparkles, Keyboard, AlertTriangle, RefreshCw, Loader2, Users, Send, Edit3, Volume2, Video,
} from "lucide-react";
import { T, categoryColor, chipBg } from "@/components/tokens";
import { PrimaryButton, SecondaryButton } from "@/components/ui/Buttons";
import { Pill, AIChip } from "@/components/ui/Pill";
import { TopBar } from "@/components/ui/TopBar";
import { MapView } from "@/components/MapView";
import { ISSUE_TYPES, ISSUE_EMOJI, resolveAuthority } from "@/lib/routing";
import { createClient, ensureAuthenticated, uploadEvidence } from "@/lib/supabase/client";

type Step =
  | "camera" | "analyzing" | "analysis-failed" | "manual-describe"
  | "confidence" | "severity" | "voice" | "location" | "duplicate"
  | "review" | "submitting" | "submitted";

interface Classification {
  isCivicIssue: boolean; issueType: string; confidence: number;
  severity: "Low" | "Medium" | "High"; explanation: string; description: string;
}
interface LocationData { lat: number; lng: number; area: string; cityLine: string; }

const LOW_CONFIDENCE_THRESHOLD = 65;
const DEFAULT_LOC = { lat: 12.9945, lng: 77.691 };

async function fileToBase64(file: File): Promise<{ base64: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1], dataUrl: result });
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

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
  const [step, setStep] = useState<Step>("camera");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [classification, setClassification] = useState<Classification | null>(null);
  const [severityChosen, setSeverityChosen] = useState<"Low" | "Medium" | "High">("Medium");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [locationStatus, setLocationStatus] = useState<"locating" | "ok" | "denied">("locating");
  const [duplicates, setDuplicates] = useState<any[]>([]);
  const [finalDescription, setFinalDescription] = useState("");
  const [submittedId, setSubmittedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const [recording, setRecording] = useState(false);

  // ---------------- Step: camera ----------------
  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const { dataUrl } = await fileToBase64(file);
    setPhotoDataUrl(dataUrl);
    e.target.value = "";
  };
  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideoFile(file);
    e.target.value = "";
  };

  const runAnalysis = async () => {
    if (!photoFile) return;
    setStep("analyzing");
    setError(null);
    try {
      await ensureAuthenticated();
      const { base64 } = await fileToBase64(photoFile);
      const res = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType: photoFile.type || "image/jpeg" }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Analysis failed");
      const result: Classification = await res.json();
      setClassification(result);
      setSeverityChosen(result.severity);
      setStep("confidence");
    } catch (err: any) {
      setError(err.message);
      setStep("analysis-failed");
    }
  };

  const handleManualDescribe = (text: string) => {
    setClassification({
      isCivicIssue: true, issueType: "Other", confidence: 0, severity: "Medium",
      explanation: "Reported directly by the citizen.", description: text,
    });
    setSeverityChosen("Medium");
    setStep("severity");
  };

  // ---------------- Step: voice ----------------
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setVoiceBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
        try {
          const form = new FormData();
          form.append("audio", blob, "voice-note.webm");
          const res = await fetch("/api/ai/transcribe", { method: "POST", body: form });
          if (res.ok) {
            const data = await res.json();
            setVoiceTranscript(data.transcript || "");
          }
        } catch {
          // Non-fatal — user can still continue without a transcript.
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError("Microphone permission was not granted.");
    }
  };
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  // ---------------- Step: location ----------------
  const findLocation = () => {
    setStep("location");
    setLocationStatus("locating");
    if (!("geolocation" in navigator)) { setLocationStatus("denied"); setLocation({ ...DEFAULT_LOC, area: "Mahadevapura", cityLine: "Bengaluru, Karnataka" }); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        try {
          const place = await reverseGeocode(lat, lng);
          setLocation({ lat, lng, ...place });
        } catch {
          setLocation({ lat, lng, area: "Your location", cityLine: "" });
        }
        setLocationStatus("ok");
      },
      () => { setLocationStatus("denied"); setLocation({ ...DEFAULT_LOC, area: "Mahadevapura", cityLine: "Bengaluru, Karnataka" }); },
      { timeout: 8000, maximumAge: 60000 }
    );
  };

  // ---------------- Step: duplicate ----------------
  const checkDuplicates = async () => {
    setStep("duplicate");
    if (!classification || !location) return;
    try {
      const res = await fetch("/api/reports/duplicates", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType: classification.issueType, latitude: location.lat, longitude: location.lng }),
      });
      const data = await res.json();
      setDuplicates(data.matches || []);
      if (!data.matches?.length) setTimeout(() => goToReview(), 300);
    } catch {
      setTimeout(() => goToReview(), 300);
    }
  };

  const joinDuplicate = async (reportId: string) => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("join_report", { p_report_id: reportId });
      if (error) throw error;
      setSubmittedId(reportId);
      setStep("submitted");
    } catch (err: any) {
      setError(err.message);
    }
  };

  // ---------------- Step: review / submit ----------------
  const goToReview = async () => {
    setStep("review");
    if (!classification || !location) return;
    try {
      const res = await fetch("/api/ai/compose", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueType: classification.issueType, severity: severityChosen,
          imageDescription: classification.description, voiceTranscript: voiceTranscript || undefined,
          location: `${location.area}, ${location.cityLine}`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setFinalDescription(data.description);
      } else {
        setFinalDescription(classification.description.replace("{location}", `${location.area}, ${location.cityLine}`));
      }
    } catch {
      setFinalDescription(classification.description.replace("{location}", `${location.area}, ${location.cityLine}`));
    }
  };

  const submitReport = async () => {
    if (!classification || !location) return;
    setStep("submitting");
    setError(null);
    try {
      const userId = await ensureAuthenticated();
      let imageUrl: string | null = null;
      let videoUrl: string | null = null;
      let voiceUrl: string | null = null;

      if (photoFile) imageUrl = await uploadEvidence(photoFile, userId, "image", (photoFile.name.split(".").pop() || "jpg"));
      if (videoFile) videoUrl = await uploadEvidence(videoFile, userId, "video", (videoFile.name.split(".").pop() || "mp4"));
      if (voiceBlob) voiceUrl = await uploadEvidence(voiceBlob, userId, "voice", "webm");

      const res = await fetch("/api/reports", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl, videoUrl, voiceUrl, voiceTranscript: voiceTranscript || null,
          issueType: classification.issueType, aiConfidence: classification.confidence || null,
          severity: severityChosen, aiExplanation: classification.explanation,
          description: finalDescription || classification.description,
          latitude: location.lat, longitude: location.lng,
          address: `${location.area}, ${location.cityLine}`, landmark: location.area,
          isDemo: false,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Submission failed");
      const data = await res.json();
      setSubmittedId(data.report.id);
      setStep("submitted");
    } catch (err: any) {
      setError(err.message);
      setStep("review");
    }
  };

  const issue = classification;
  const emoji = issue ? ISSUE_EMOJI[issue.issueType] || "❗" : "❗";

  // ============================= RENDER =============================
  if (step === "camera") {
    return (
      <div className="flex flex-col min-h-full pb-8" style={{ background: T.ink }}>
        <div className="px-6 pt-5"><TopBar onBack={() => router.push("/home")} /></div>
        <div className="px-6">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 22, color: "#fff" }}>Show us the problem</div>
          <div className="text-[13.5px] mt-1" style={{ color: "#C9D4CD" }}>Take a clear photo of what needs attention.</div>
        </div>
        <div className="mx-6 mt-6 rounded-[32px] flex-1 flex items-center justify-center relative overflow-hidden" style={{ background: "#1B2B22", minHeight: 300, border: "1px solid rgba(255,255,255,0.08)" }}>
          {photoDataUrl ? <img src={photoDataUrl} alt="" className="w-full h-full object-cover absolute inset-0" /> : <Camera size={44} color="rgba(255,255,255,0.35)" strokeWidth={1.4} />}
        </div>
        <div className="px-6 mt-6 space-y-3">
          {!photoDataUrl ? (
            <div className="flex items-center justify-center gap-6">
              <button onClick={() => fileRef.current?.click()} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}><ImageIcon size={19} color="#fff" /></button>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
              <button onClick={() => fileRef.current?.click()} className="w-[72px] h-[72px] rounded-full flex items-center justify-center active:scale-95 transition" style={{ background: "#fff", border: `5px solid ${T.green}` }}><span className="w-[52px] h-[52px] rounded-full" style={{ background: T.green }} /></button>
              <button onClick={() => videoRef.current?.click()} className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.1)" }}><Video size={18} color="#fff" /></button>
              <input ref={videoRef} type="file" accept="video/*" capture="environment" className="hidden" onChange={handleVideo} />
            </div>
          ) : (
            <div className="flex gap-3">
              <SecondaryButton onClick={() => { setPhotoFile(null); setPhotoDataUrl(null); }}><span className="flex items-center justify-center gap-2"><RotateCcw size={16} /> Retake</span></SecondaryButton>
              <PrimaryButton onClick={runAnalysis} icon={<Check size={17} />}>Use photo</PrimaryButton>
            </div>
          )}
          {videoFile && <div className="text-center text-[12px]" style={{ color: "#8FA398" }}>+ 1 video attached ({videoFile.name})</div>}
        </div>
      </div>
    );
  }

  if (step === "analyzing") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-10 items-center">
        {photoDataUrl && <img src={photoDataUrl} className="w-full rounded-[32px] object-cover" style={{ height: 260 }} alt="" />}
        <div className="mt-8 text-center" style={{ fontFamily: "var(--font-baloo)", fontWeight: 500, fontSize: 20, color: T.ink }}>Analyzing your image…</div>
        <Loader2 className="animate-spin mt-6" size={28} color={T.green} />
      </div>
    );
  }

  if (step === "analysis-failed") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-12 pb-8 items-center justify-between">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5" style={{ background: T.rustTint }}><AlertTriangle size={26} color={T.rust} /></div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 20, color: T.ink }}>AI analysis is temporarily unavailable</div>
          <div className="mt-2 text-[13.5px] max-w-[280px] mx-auto" style={{ color: T.inkSoft }}>{error || "We couldn't reach the image analysis service."} Your photo hasn't been lost.</div>
        </div>
        <div className="w-full space-y-3"><PrimaryButton onClick={runAnalysis} icon={<RefreshCw size={17} />}>Retry</PrimaryButton><SecondaryButton onClick={() => setStep("manual-describe")}>Describe manually</SecondaryButton></div>
      </div>
    );
  }

  if (step === "manual-describe") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-5 pb-8 justify-between">
        <div>
          <TopBar onBack={() => setStep("camera")} />
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 21, color: T.ink }}>Tell us what happened</div>
          <textarea value={manualText} onChange={(e) => setManualText(e.target.value)} rows={6} placeholder="e.g. There's a deep pothole outside my building..." className="w-full mt-5 rounded-[24px] p-4 text-[14px] outline-none" style={{ background: T.card, border: `1.5px solid ${T.line}`, color: T.ink }} />
        </div>
        <PrimaryButton disabled={manualText.trim().length < 5} onClick={() => handleManualDescribe(manualText.trim())} icon={<ChevronRight size={18} />}>Continue</PrimaryButton>
      </div>
    );
  }

  if (step === "confidence" && issue) {
    const low = issue.confidence < LOW_CONFIDENCE_THRESHOLD;
    if (low) {
      return (
        <div className="flex flex-col min-h-full px-6 pt-10 pb-8 items-center justify-between">
          <div className="w-full text-center">
            {photoDataUrl && <img src={photoDataUrl} className="w-full rounded-[24px] object-cover mb-4" style={{ height: 190 }} alt="" />}
            <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 19, color: T.ink }}>I&apos;m not completely sure what I&apos;m seeing.</div>
            <div className="mt-2 text-[13px]" style={{ color: T.inkSoft }}>My best guess is <b style={{ color: T.ink }}>{issue.issueType}</b>, but I&apos;d rather ask than assume.</div>
          </div>
          <div className="w-full space-y-3">
            <button onClick={() => setStep("voice")} className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-extrabold" style={{ background: T.green, color: "#fff" }}><Mic size={17} /> Speak</button>
            <button onClick={() => setStep("manual-describe")} className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 font-extrabold" style={{ background: "transparent", color: T.ink, border: `1.5px solid ${T.line}` }}><Keyboard size={17} /> Type</button>
            <button onClick={() => setStep("camera")} className="w-full flex items-center justify-center gap-2 rounded-2xl py-3 font-extrabold text-[14px]" style={{ background: "transparent", color: T.inkSoft }}><RotateCcw size={15} /> Retake photo</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-full px-6 pt-10 pb-8 items-center justify-between">
        <div className="w-full text-center">
          <div style={{ fontSize: 13.5, color: T.inkSoft }}>I think I found...</div>
          {photoDataUrl && <img src={photoDataUrl} className="w-full rounded-[24px] object-cover mt-4 mb-1" style={{ height: 170 }} alt="" />}
          <div className="mt-3" style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 28, color: categoryColor(issue.issueType) }}>{issue.issueType}</div>
          <div className="flex justify-center mt-3"><AIChip>{issue.confidence}% confidence</AIChip></div>
          <div className="mt-6 text-[14.5px]" style={{ color: T.inkSoft }}>Is this the problem you&apos;d like to report?</div>
        </div>
        <div className="w-full space-y-3">
          <PrimaryButton onClick={() => setStep("severity")} icon={<Check size={17} />}>Yes, that&apos;s it</PrimaryButton>
          <SecondaryButton onClick={() => setStep("camera")}>Try another photo</SecondaryButton>
        </div>
      </div>
    );
  }

  if (step === "severity" && issue) {
    const opts = [{ key: "High" as const, sub: "Could be dangerous", color: T.rust, e: "🔥" }, { key: "Medium" as const, sub: "Needs attention", color: T.amber, e: "⚡" }, { key: "Low" as const, sub: "Minor issue", color: T.blue, e: "🌱" }];
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 24, color: T.ink }}>How serious does this look?</div>
          <div className="mt-3 rounded-[24px] p-3.5 flex gap-2.5" style={{ background: `${T.purple}12`, border: `2px solid ${T.purple}33` }}>
            <Sparkles size={16} color={T.purple} className="shrink-0 mt-0.5" />
            <div style={{ fontSize: 13 }}><span style={{ color: T.purple, fontWeight: 800 }}>I&apos;d recommend {issue.severity}. </span><span style={{ color: T.inkSoft }}>{issue.explanation}</span></div>
          </div>
          <div className="mt-6 space-y-3">
            {opts.map((o) => { const active = severityChosen === o.key; return (
              <button key={o.key} onClick={() => setSeverityChosen(o.key)} className="w-full flex items-center gap-3 rounded-[24px] px-4 py-4 text-left transition active:scale-[0.97]" style={{ background: active ? o.color + "1F" : T.card, border: `2.5px solid ${active ? o.color : T.line}`, boxShadow: active ? `3px 3px 0px ${o.color}55` : "none" }}>
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: o.color + "22" }}>{o.e}</div>
                <div className="flex-1"><div style={{ fontWeight: 800, fontSize: 15.5, color: active ? o.color : T.ink }}>{o.key}</div><div style={{ fontSize: 12.5, color: T.inkSoft }}>{o.sub}</div></div>
                {o.key === issue.severity && <Pill tone="purple">AI pick</Pill>}
              </button>
            ); })}
          </div>
        </div>
        <PrimaryButton onClick={() => setStep("voice")} icon={<ChevronRight size={18} />}>Continue</PrimaryButton>
      </div>
    );
  }

  if (step === "voice") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-10 pb-8 justify-between items-center">
        <div className="w-full text-center">
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 21, color: T.ink }}>Want to tell us anything else?</div>
          <div className="mt-1.5 text-[13.5px]" style={{ color: T.inkSoft }}>Optional — speak naturally, in your language.</div>
        </div>
        <div className="flex flex-col items-center gap-5">
          <button onClick={recording ? stopRecording : startRecording} className="w-24 h-24 rounded-full flex items-center justify-center relative active:scale-95 transition" style={{ background: recording ? T.rust : T.green }}>
            {recording && <span className="absolute inset-0 rounded-full animate-ping" style={{ background: T.rust, opacity: 0.3 }} />}<Mic size={30} color="#fff" />
          </button>
          <div style={{ fontSize: 13, color: T.inkSoft }}>{recording ? "Listening... tap to stop" : voiceTranscript ? "Got it" : "Tap to speak"}</div>
        </div>
        {voiceTranscript ? (
          <div className="w-full">
            <div className="rounded-[24px] p-4 mb-4" style={{ background: T.greenTint }}>
              <div className="flex items-center gap-1.5 mb-1.5" style={{ color: T.greenDeep, fontSize: 11.5, fontWeight: 700 }}><Volume2 size={13} /> WE HEARD</div>
              <div style={{ fontSize: 14, color: T.ink, fontStyle: "italic" }}>&quot;{voiceTranscript}&quot;</div>
            </div>
            <PrimaryButton onClick={findLocation} icon={<Check size={17} />}>Confirm</PrimaryButton>
          </div>
        ) : (
          <SecondaryButton onClick={findLocation}>Skip this step</SecondaryButton>
        )}
      </div>
    );
  }

  if (step === "location") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 21, color: T.ink }}>
            {locationStatus === "locating" ? "Finding your location…" : locationStatus === "denied" ? "Using a default location" : "I found the location 📍"}
          </div>
          <div className="mt-5 rounded-[32px] overflow-hidden" style={{ height: 210 }}>
            <MapView height={210} center={location ? { lat: location.lat, lng: location.lng } : DEFAULT_LOC} zoom={16} markers={location ? [{ lat: location.lat, lng: location.lng, color: T.green, big: true }] : []} />
          </div>
          <div className="mt-4 rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: T.ink }}>{location?.area || "…"}</div>
            <div style={{ fontSize: 13, color: T.inkSoft }}>{location?.cityLine}</div>
          </div>
          {locationStatus === "denied" && <div className="mt-2 text-[12px] flex items-center gap-1.5" style={{ color: T.rust }}><AlertTriangle size={13} /> Location permission wasn&apos;t granted — using a default area.</div>}
        </div>
        <PrimaryButton onClick={checkDuplicates} icon={<Check size={17} />} disabled={locationStatus === "locating"}>{locationStatus === "locating" ? "Locating…" : "Yes, continue"}</PrimaryButton>
      </div>
    );
  }

  if (step === "duplicate") {
    if (!duplicates.length) {
      return (
        <div className="flex flex-col min-h-full px-6 pt-16 items-center justify-center">
          <Loader2 className="animate-spin" size={22} color={T.green} />
          <div className="mt-3 text-[13.5px]" style={{ color: T.inkSoft }}>Checking nearby reports…</div>
        </div>
      );
    }
    const top = duplicates[0].report;
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 20, color: T.ink }}>🔎 We found a similar report nearby</div>
          <div className="mt-1.5 text-[13.5px]" style={{ color: T.inkSoft }}>About {Math.round(duplicates[0].distance)}m away, same category.</div>
          <div className="mt-5 rounded-[24px] p-4" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-[18px] flex items-center justify-center text-xl" style={{ background: chipBg(top.issue_type) }}>{ISSUE_EMOJI[top.issue_type]}</div>
              <div className="flex-1"><div style={{ fontWeight: 700, fontSize: 14, color: T.ink }}>{top.issue_type}</div><div style={{ fontSize: 12, color: T.inkSoft }}>{top.landmark}</div></div>
            </div>
            <div className="flex items-center gap-1.5 mt-3" style={{ color: T.green, fontSize: 12.5, fontWeight: 600 }}><Users size={14} /> {top.affected_count} citizen{top.affected_count === 1 ? "" : "s"} affected</div>
          </div>
        </div>
        <div className="space-y-3">
          <PrimaryButton onClick={() => joinDuplicate(top.id)} icon={<Users size={17} />}>Join existing report</PrimaryButton>
          <SecondaryButton onClick={goToReview}>Report separately</SecondaryButton>
        </div>
      </div>
    );
  }

  if (step === "review" && issue && location) {
    const authority = resolveAuthority(issue.issueType);
    return (
      <div className="flex flex-col min-h-full px-6 pt-8 pb-8 justify-between">
        <div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 21, color: T.ink }}>Here&apos;s what I&apos;ll report</div>
          {photoDataUrl && <img src={photoDataUrl} className="w-full rounded-[24px] object-cover mt-4" style={{ height: 150 }} alt="" />}
          <div className="mt-4 rounded-[24px] overflow-hidden" style={{ background: T.card, border: `1px solid ${T.line}` }}>
            {[["Issue", `${emoji} ${issue.issueType}`], ["Location", `${location.area}, ${location.cityLine}`], ["Severity", severityChosen], ["Authority", authority.authority]].map(([k, v], i, arr) => (
              <div key={k} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < arr.length - 1 ? `1px solid ${T.line}` : "none" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: T.inkSoft, textTransform: "uppercase" }}>{k}</span>
                <span style={{ fontSize: 13.5, color: T.ink, fontWeight: 600, textAlign: "right", maxWidth: 190 }}>{v}</span>
              </div>
            ))}
          </div>
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <span style={{ fontSize: 12, fontWeight: 700, color: T.inkSoft, textTransform: "uppercase" }}>Your report</span>
            </div>
            <textarea value={finalDescription} onChange={(e) => setFinalDescription(e.target.value)} rows={5} className="w-full rounded-[24px] p-4 text-[14px] outline-none" style={{ background: T.greenTint, border: `1.5px solid ${T.green}55`, color: T.ink }} />
          </div>
          {error && <div className="mt-3 text-[12.5px]" style={{ color: T.rust }}>{error}</div>}
        </div>
        <PrimaryButton onClick={submitReport} icon={<Send size={17} />} disabled={!finalDescription}>Looks good — submit</PrimaryButton>
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <div className="flex flex-col min-h-full px-6 pt-16 items-center">
        <Loader2 className="animate-spin" size={30} color={T.green} />
        <div className="mt-4" style={{ fontFamily: "var(--font-baloo)", fontWeight: 600, fontSize: 19, color: T.ink }}>Submitting your report…</div>
      </div>
    );
  }

  if (step === "submitted" && submittedId) {
    return (
      <div className="flex flex-col min-h-full px-6 pt-14 pb-8 items-center justify-between">
        <div className="w-full text-center">
          <div className="text-5xl mb-4">✅</div>
          <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 24, color: T.ink }}>Report submitted!</div>
          <div className="mt-2 text-[13.5px]" style={{ color: T.inkSoft }}>Your report has been created and is now trackable.</div>
        </div>
        <div className="w-full space-y-3">
          <PrimaryButton onClick={() => router.push(`/reports/${submittedId}`)} icon={<ChevronRight size={18} />}>Track report</PrimaryButton>
          <SecondaryButton onClick={() => router.push("/home")}>Report another issue</SecondaryButton>
        </div>
      </div>
    );
  }

  return null;
}
