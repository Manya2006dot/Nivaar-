import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, requireAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

const VALID = ["Submitted", "Acknowledged", "Assigned", "In Progress", "Resolved"];

// PATCH /api/reports/:id/status — admin-only. Inserting into status_history
// (rather than updating reports.status directly) preserves the full,
// permanent audit trail, and a DB trigger keeps reports.status in sync.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const admin = await requireAdmin(); // throws if not an admin
    const { status, note } = await req.json();
    if (!VALID.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${VALID.join(", ")}` }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const { data, error } = await supabase
      .from("status_history")
      .insert({ report_id: params.id, status, note: note ?? null, changed_by: admin.id })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ statusHistoryEntry: data });
  } catch (err: any) {
    const message = err?.message === "Not authorized" ? "Admin access required." : "Could not update status.";
    console.error("[reports:status] error:", err);
    return NextResponse.json({ error: message, detail: err?.message }, { status: err?.message === "Not authorized" ? 403 : 500 });
  }
}
