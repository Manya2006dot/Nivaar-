import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyResolution } from "@/lib/ai/provider";

export const runtime = "nodejs";

async function fetchAsBase64(url: string): Promise<{ base64: string; mediaType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch image at ${url}`);
  const mediaType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { base64: buf.toString("base64"), mediaType };
}

// POST /api/reports/:id/resolution — the citizen (or an admin) uploads an
// "after" photo (client already put it in Supabase Storage and passes the
// resulting public URL here). We run a real before/after AI comparison and
// record it — clearly labeled as an AI assessment, never presented as a
// ground-truth fact, per the product's transparency requirement.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const { imageUrl } = await req.json();
    if (!imageUrl) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });

    const { data: report, error: reportErr } = await supabase
      .from("reports").select("image_url, issue_type").eq("id", params.id).single();
    if (reportErr) throw reportErr;
    if (!report?.image_url) {
      return NextResponse.json({ error: "Original report has no photo to compare against." }, { status: 400 });
    }

    let aiVerification = null;
    try {
      const before = await fetchAsBase64(report.image_url);
      const after = await fetchAsBase64(imageUrl);
      aiVerification = await verifyResolution(before.base64, before.mediaType, after.base64, after.mediaType, report.issue_type);
    } catch (aiErr) {
      console.error("[resolution] AI verification failed, saving photo without it:", aiErr);
    }

    const { data, error } = await supabase
      .from("resolution_images")
      .insert({ report_id: params.id, image_url: imageUrl, ai_verification: aiVerification })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ resolutionImage: data });
  } catch (err: any) {
    console.error("[resolution] error:", err);
    return NextResponse.json({ error: "Could not save resolution photo.", detail: err?.message }, { status: 500 });
  }
}
