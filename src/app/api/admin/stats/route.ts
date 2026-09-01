import { NextResponse } from "next/server";
import { createServerSupabase, requireAdmin } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireAdmin();
    const supabase = createServerSupabase();
    const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
    if (error) throw error;

    const rows = data || [];
    const byStatus: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    for (const r of rows) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      byCategory[r.issue_type] = (byCategory[r.issue_type] || 0) + 1;
      bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
    }

    return NextResponse.json({
      total: rows.length,
      open: rows.filter((r) => r.status !== "Resolved").length,
      inProgress: rows.filter((r) => r.status === "In Progress").length,
      resolved: rows.filter((r) => r.status === "Resolved").length,
      byStatus, byCategory, bySeverity,
      reports: rows,
    });
  } catch (err: any) {
    const isAuth = err?.message === "Not authorized" || err?.message === "Not authenticated";
    return NextResponse.json({ error: isAuth ? "Admin access required." : "Could not load dashboard.", detail: err?.message }, { status: isAuth ? 403 : 500 });
  }
}
