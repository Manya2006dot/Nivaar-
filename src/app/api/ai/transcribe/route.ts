import { NextRequest, NextResponse } from "next/server";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds. Note: capped at 10s on Vercel's Hobby plan regardless of this setting; Pro plans honor it.

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const form = await req.formData();
    const file = form.get("audio") as File | null;
    if (!file) return NextResponse.json({ error: "audio file is required" }, { status: 400 });

    console.log("[transcribe] processing", { userId: user.id, sizeBytes: file.size, type: file.type });
    const transcript = await transcribeAudio(file, file.name || "voice-note.webm");
    return NextResponse.json({ transcript });
  } catch (err: any) {
    console.error("[transcribe] error:", { message: err?.message, stack: err?.stack });
    return NextResponse.json(
      { error: "Voice transcription is temporarily unavailable.", detail: err?.message },
      { status: 502 }
    );
  }
}
