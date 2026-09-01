import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase, createServiceRoleClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

// POST /api/admin/claim — a lightweight, replaceable gate: enter the shared
// ADMIN_ACCESS_CODE once, and your current (real, authenticated) session
// gets profiles.is_admin = true. Every admin action afterward is checked
// through real RLS / requireAdmin(), not through this passcode again.
//
// This is intentionally simple so you can ship something real today. For
// production, replace this with real role-based auth (e.g. an invite-only
// admin signup, or manually setting is_admin in the Supabase table editor
// for specific trusted accounts) — see README "Upgrading admin auth".
export async function POST(req: NextRequest) {
  try {
    const { code } = await req.json();
    if (!process.env.ADMIN_ACCESS_CODE) {
      return NextResponse.json({ error: "ADMIN_ACCESS_CODE is not configured on the server." }, { status: 500 });
    }
    if (code !== process.env.ADMIN_ACCESS_CODE) {
      return NextResponse.json({ error: "Incorrect code." }, { status: 401 });
    }

    const sessionClient = createServerSupabase();
    const { data: { user } } = await sessionClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const service = createServiceRoleClient();
    const { error } = await service.from("profiles").update({ is_admin: true }).eq("id", user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin:claim] error:", err);
    return NextResponse.json({ error: "Could not grant admin access.", detail: err?.message }, { status: 500 });
  }
}
