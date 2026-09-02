import { NextRequest, NextResponse } from "next/server";
import { classifyImage } from "@/lib/ai/provider";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30; // seconds. Note: capped at 10s on Vercel's Hobby plan regardless of this setting; Pro plans honor it.
// Vercel's request body limit (~4.5MB on Hobby/Pro) is a hard platform
// limit enforced before this function even runs — it cannot be raised via
// Next.js config. The real fix is client-side compression (see
// src/lib/imageCompress.ts) so we never approach it. This guard is a
// second, defensive line: if a payload somehow still gets through at a size
// that would strain the AI provider, we reject it cleanly with JSON instead
// of letting the upstream call fail unpredictably.
const MAX_BASE64_CHARS = 6_000_000; // ~4.5MB decoded, safely under the platform limit

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { imageBase64, mediaType } = await req.json();
    if (!imageBase64 || !mediaType) {
      return NextResponse.json({ error: "imageBase64 and mediaType are required" }, { status: 400 });
    }

    if (imageBase64.length > MAX_BASE64_CHARS) {
      console.error("[classify] rejected oversized payload:", { base64Chars: imageBase64.length, userId: user.id });
      return NextResponse.json(
        { error: "That photo is too large even after compression. Please try a different photo." },
        { status: 413 }
      );
    }

    console.log("[classify] analyzing", { userId: user.id, mediaType, base64Chars: imageBase64.length });
    const result = await classifyImage(imageBase64, mediaType);
    console.log("[classify] result", { userId: user.id, issueType: result.issueType, confidence: result.confidence });
    return NextResponse.json(result);
  } catch (err: any) {
    // Logged with full detail server-side (visible in Vercel's Runtime Logs)
    // while the client only ever sees a clean, safe JSON error.
    console.error("[classify] error:", { message: err?.message, stack: err?.stack });
    return NextResponse.json(
      { error: "AI analysis is temporarily unavailable.", detail: err?.message },
      { status: 502 }
    );
  }
}
