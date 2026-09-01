import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";

// Server client that reads the caller's session from cookies — respects RLS
// as that specific user. Use this in API routes / server components whenever
// an action should be scoped to "whoever is calling this."
export function createServerSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // No-op in route handlers that don't need to refresh cookies here;
          // Next.js middleware (see middleware.ts) handles session refresh.
        },
        remove() {},
      },
    }
  );
}

// Privileged client using the SERVICE ROLE key. This BYPASSES Row Level
// Security entirely. It must only ever be constructed inside server-side
// code (API routes) — never imported into a "use client" file, and the key
// itself must never be prefixed with NEXT_PUBLIC_.
//
// Used for: admin dashboard aggregate queries, and any operation that
// legitimately needs to see across all users' data after we've verified
// (via createServerSupabase() + profiles.is_admin) that the caller really is
// an admin.
export function createServiceRoleClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. See .env.example.");
  }
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Verifies the current request's session belongs to an admin. Throws if not.
export async function requireAdmin() {
  const supabase = createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) throw new Error("Not authorized");
  return user;
}
