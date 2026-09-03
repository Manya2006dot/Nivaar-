"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAuthenticated } from "@/lib/supabase/client";

// This screen displays the exact provided artwork (public/welcome-artwork.png)
// unmodified — no recreation, no CSS illustration, no filters. The only
// interactive element is a fully transparent <button> positioned with
// percentage coordinates over the "Get Started" pill drawn in the artwork,
// so it stays pixel-aligned at any screen size without ever touching the
// image itself. Coordinates were measured directly from the source PNG
// (1024x1536): the button spans x 23.2%-77.0%, y 90.7%-98.1%.
export default function WelcomeScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    ensureAuthenticated().catch(() => {});
    if (typeof window !== "undefined" && localStorage.getItem("nivaar_lang")) {
      router.replace("/home");
      return;
    }
    setChecked(true);
  }, [router]);

  if (!checked) return null;

  return (
    <div className="flex-1 overflow-y-auto flex flex-col">
      <div className="relative w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/welcome-artwork.png"
          alt="Nivaar — Report. Resolve. Improve. AI-powered civic reporting for a cleaner, safer, better city."
          className="w-full h-auto block select-none"
          draggable={false}
        />
        <button
          type="button"
          aria-label="Get Started"
          onClick={() => router.push("/language")}
          className="absolute active:opacity-70 transition"
          style={{ left: "23.2%", top: "90.7%", width: "53.8%", height: "7.4%" }}
        />
      </div>
    </div>
  );
}
