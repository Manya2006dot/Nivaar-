import { NextRequest, NextResponse } from "next/server";
import { classifyImage } from "@/lib/ai/provider";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "imageBase64 and mediaType are required" }, { status: 400 });
    }

    const result = await classifyImage(imageBase64, mediaType);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[classify] error:", err);
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable.", detail: err?.message },
      { status: 502 }
    );
  }
}
