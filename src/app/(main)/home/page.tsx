"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Globe } from "lucide-react";
import { T } from "@/components/tokens";
import { createClient, ensureAuthenticated } from "@/lib/supabase/client";

export default function HomeScreen() {
  const router = useRouter();
  const [active, setActive] = useState(0);
  const [resolved, setResolved] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const userId = await ensureAuthenticated();
        const supabase = createClient();
        const { data } = await supabase
          .from("reports")
          .select("status, is_demo")
          .eq("user_id", userId)
          .eq("is_demo", false);
        const rows = data || [];
        setActive(rows.filter((r) => r.status !== "Resolved").length);
        setResolved(rows.filter((r) => r.status === "Resolved").length);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-full px-6 pt-6 pb-6">
      <div className="flex items-center justify-between mb-1">
        <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 800, fontSize: 23, color: T.green }}>Nivaar</div>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: T.card, border: `2px solid ${T.line}` }}><Globe size={16} color={T.green} /></div>
      </div>
      <div className="text-[13.5px] mb-8" style={{ color: T.inkSoft, fontWeight: 600 }}>Hi 👋</div>
      <div className="text-center mb-1">
        <div className="mx-auto max-w-[280px]" style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 27, lineHeight: 1.2, color: T.ink }}>See something that needs fixing?</div>
        <div className="text-[14.5px] mt-2.5" style={{ color: T.inkSoft, fontWeight: 500 }}>Take a photo. We&apos;ll handle the rest.</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center py-8">
        <button onClick={() => router.push("/report")} className="relative w-44 h-44 rounded-full flex items-center justify-center active:scale-90 transition" style={{ background: `linear-gradient(135deg, ${T.green}, ${T.greenDeep})`, boxShadow: `0 22px 45px -12px ${T.green}99` }}>
          <span className="absolute inset-0 rounded-full animate-ping" style={{ background: T.green, opacity: 0.25 }} />
          <span className="absolute -inset-2 rounded-full" style={{ border: `3px dashed ${T.green}55` }} />
          <Camera size={50} color="#fff" strokeWidth={1.8} />
        </button>
        <div className="mt-6 px-5 py-2 rounded-full" style={{ background: T.ink }}>
          <span className="text-[14px] font-bold" style={{ color: "#fff" }}>Tap to report</span>
        </div>
      </div>
      <div>
        <div className="text-[12px] font-bold uppercase tracking-wide mb-3" style={{ color: T.inkSoft }}>Your reports {loading && "· loading..."}</div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[24px] p-4" style={{ background: T.amberTint, border: `2px solid ${T.amber}33` }}>
            <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 28, color: "#B96A00" }}>{active}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>Active</div>
          </div>
          <div className="rounded-[24px] p-4" style={{ background: T.greenTint, border: `2px solid ${T.green}33` }}>
            <div style={{ fontFamily: "var(--font-baloo)", fontWeight: 700, fontSize: 28, color: T.greenDeep }}>{resolved}</div>
            <div style={{ fontSize: 12.5, color: T.inkSoft, fontWeight: 600 }}>Resolved</div>
          </div>
        </div>
      </div>
    </div>
  );
}
