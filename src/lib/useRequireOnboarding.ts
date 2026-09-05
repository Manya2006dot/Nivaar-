"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Guarantees a route can never be a valid "cold start" for a browser that
// hasn't completed language selection — closing the one scenario where our
// own app could theoretically show an inner page (like /report) as someone's
// very first screen. A stale home-screen bookmark pointing at an inner route
// on a fresh/cleared browser will bounce straight back to Welcome instead of
// rendering a premature/broken flow.
export function useRequireOnboarding() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let onboarded = false;
    try {
      onboarded = typeof window !== "undefined" && !!localStorage.getItem("nivaar_lang");
    } catch {
      // Some private-browsing modes throw on localStorage access instead of
      // just returning null. Treat that the same as "not onboarded" rather
      // than letting an uncaught error leave this hook stuck.
      onboarded = false;
    }
    if (!onboarded) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [router]);

  return ready;
}
