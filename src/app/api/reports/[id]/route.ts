import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

// GET /api/reports/:id — report detail + full status timeline + any
// resolution photos. Public read (reports are transparent civic data), so
// this works whether or not the caller owns the report.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabase();

    const [{ data: report, error: reportErr }, { data: history, error: histErr }, { data: resolutions, error: resErr }] =
      await Promise.all([
        supabase.from("reports").select("*").eq("id", params.id).single(),
        supabase.from("status_history").select("*").eq("report_id", params.id).order("created_at", { ascending: true }),
        supabase.from("resolution_images").select("*").eq("report_id", params.id).order("created_at", { ascending: true }),
      ]);

    if (reportErr) throw reportErr;
    if (histErr) throw histErr;
    if (resErr) throw resErr;

    return NextResponse.json({ report, history, resolutions });
  } catch (err: any) {
    console.error("[reports:get] error:", err);
    return NextResponse.json({ error: "Report not found.", detail: err?.message }, { status: 404 });
  }
}
