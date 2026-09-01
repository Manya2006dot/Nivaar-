"use client";

import { createBrowserClient } from "@supabase/ssr";

// Browser-side Supabase client. Uses only the public URL + anon key — safe
// to ship to the client, because every table is protected by Row Level
// Security (see supabase/schema.sql). This client never sees the service
// role key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

// -----------------------------------------------------------------------------
// Auth model: Nivaar's product principle is "almost zero manual input," so we
// don't force a signup/login screen. Instead we use Supabase's real
// Anonymous Sign-in (Authentication -> Providers -> Anonymous Sign-ins must be
// enabled in your Supabase project). This gives every visitor a genuine,
// stable auth.uid() backed by a real JWT session — which is what makes the
// Row Level Security policies in schema.sql actually secure. It is NOT a
// client-supplied/spoofable ID like a plain cookie would be.
//
// If you later want real accounts (phone/email), you can upgrade a session
// with supabase.auth.updateUser() / linkIdentity() without losing the user's
// existing anonymous report history.
// -----------------------------------------------------------------------------
let ensureAuthPromise: Promise<string> | null = null;

export async function ensureAuthenticated(): Promise<string> {
  if (ensureAuthPromise) return ensureAuthPromise;

  ensureAuthPromise = (async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;

    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) {
      throw new Error(
        "Could not start a session. Make sure Anonymous Sign-ins are enabled " +
          "in Supabase (Authentication -> Providers -> Anonymous Sign-ins)."
      );
    }
    return data.user.id;
  })();

  return ensureAuthPromise;
}

// Builds a storage path that satisfies the RLS policy
// `(storage.foldername(name))[1] = auth.uid()::text`.
export function evidencePath(userId: string, kind: "image" | "video" | "voice", ext: string) {
  return `${userId}/${kind}-${Date.now()}.${ext}`;
}
export function resolutionPath(userId: string, ext: string) {
  return `${userId}/resolution-${Date.now()}.${ext}`;
}

export async function uploadEvidence(
  file: Blob,
  userId: string,
  kind: "image" | "video" | "voice",
  ext: string
): Promise<string> {
  const supabase = createClient();
  const path = evidencePath(userId, kind, ext);
  const { error } = await supabase.storage.from("evidence").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("evidence").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadResolutionPhoto(file: Blob, userId: string, ext: string): Promise<string> {
  const supabase = createClient();
  const path = resolutionPath(userId, ext);
  const { error } = await supabase.storage.from("resolution").upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("resolution").getPublicUrl(path);
  return data.publicUrl;
}
