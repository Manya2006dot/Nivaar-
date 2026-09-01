import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveAuthority } from "@/lib/routing";

export const runtime = "nodejs";

// POST /api/reports — create a real report row. RLS (reports_insert_own)
// still enforces user_id = auth.uid() even though we set it explicitly here,
// so this can never create a report on someone else's behalf.
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const body = await req.json();
    const {
      imageUrl, videoUrl, voiceUrl, voiceTranscript,
      issueType, aiConfidence, severity, aiExplanation, description,
      latitude, longitude, address, landmark,
      isDemo,
    } = body;

    if (!issueType || !severity || !description || latitude == null || longitude == null) {
      return NextResponse.json({ error: "Missing required report fields" }, { status: 400 });
    }

    const routing = resolveAuthority(issueType);

    const { data, error } = await supabase
      .from("reports")
      .insert({
        user_id: user.id,
        image_url: imageUrl ?? null,
        video_url: videoUrl ?? null,
        voice_url: voiceUrl ?? null,
        voice_transcript: voiceTranscript ?? null,
        issue_type: issueType,
        ai_confidence: aiConfidence ?? null,
        severity,
        ai_explanation: aiExplanation ?? null,
        description,
        latitude, longitude, address: address ?? null, landmark: landmark ?? null,
        department: routing.department,
        authority: routing.authority,
        is_demo: !!isDemo,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ report: data });
  } catch (err: any) {
    console.error("[reports:create] error:", err);
    return NextResponse.json({ error: "Could not create the report.", detail: err?.message }, { status: 500 });
  }
}

// GET /api/reports — the caller's own reports (My Reports screen).
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reports: data });
  } catch (err: any) {
    console.error("[reports:list] error:", err);
    return NextResponse.json({ error: "Could not load reports.", detail: err?.message }, { status: 500 });
  }
}
