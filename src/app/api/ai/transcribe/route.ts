import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "audio file is required" }, { status: 400 });

    const transcript = await transcribeAudio(file, file.name || "voice-note.webm");
    return NextResponse.json({ transcript });
  } catch (err: any) {
    console.error("[transcribe] error:", err);
    return NextResponse.json(
      { error: "Voice transcription is temporarily unavailable.", detail: err?.message },
      { status: 502 }
    );
  }
}
