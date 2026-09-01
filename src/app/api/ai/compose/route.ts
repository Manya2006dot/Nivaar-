import { NextRequest, NextResponse } from "next/server";
import { composeReport } from "@/lib/ai/provider";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { issueType, severity, imageDescription, voiceTranscript, location } = await req.json();
    if (!issueType || !severity || !imageDescription || !location) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const description = await composeReport({ issueType, severity, imageDescription, voiceTranscript, location });
    return NextResponse.json({ description });
  } catch (err: any) {
    console.error("[compose] error:", err);
    return NextResponse.json({ error: "Could not prepare the report text.", detail: err?.message }, { status: 502 });
  }
}
