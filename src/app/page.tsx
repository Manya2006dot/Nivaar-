"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ensureAuthenticated } from "@/lib/supabase/client";

// public/welcome-artwork.png is used completely unmodified — its real pixel
// dimensions, needed below purely for math (not for altering the file).
const NATURAL_W = 1024;
const NATURAL_H = 1536;

// Exact pixel fractions of the "Get Started" pill within the artwork,
// measured directly from the source file's pixel data (not eyeballed).
// These never change — what changes per device is how object-fit: cover
// scales/crops the artwork to fill the screen with no gap, which we
// replicate here so the invisible clickable hit-area always lines up with
// the visibly-drawn button regardless of screen aspect ratio.
const BTN = { left: 0.232, top: 0.907, width: 0.538, height: 0.074 };

export default function WelcomeScreen() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [btnRect, setBtnRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);

  useEffect(() => {
    ensureAuthenticated().catch(() => {});
    let alreadyOnboarded = false;
    try {
      alreadyOnboarded = typeof window !== "undefined" && !!localStorage.getItem("nivaar_lang");
    } catch {
      alreadyOnboarded = false;
    }
    if (alreadyOnboarded) {
      router.replace("/home");
      return;
    }
    setChecked(true);
  }, [router]);

  // Replicates object-fit: cover's own scale/crop math so the transparent
  // button can be positioned in real pixels that always match the visible
  // artwork, on any screen size — a fixed percentage would drift once the
  // artwork starts getting cropped on left/right to fill taller screens.
  useEffect(() => {
    if (!checked || !containerRef.current) return;
    const el = containerRef.current;

    const recompute = () => {
      const { width: containerW, height: containerH } = el.getBoundingClientRect();
      if (!containerW || !containerH) return;
      const scale = Math.max(containerW / NATURAL_W, containerH / NATURAL_H);
      const renderedW = NATURAL_W * scale;
      const renderedH = NATURAL_H * scale;
      const offsetX = (containerW - renderedW) / 2;
      const offsetY = (containerH - renderedH) / 2;
      setBtnRect({
        left: offsetX + BTN.left * renderedW,
        top: offsetY + BTN.top * renderedH,
        width: BTN.width * renderedW,
        height: BTN.height * renderedH,
      });
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    window.addEventListener("orientationchange", recompute);
    return () => { ro.disconnect(); window.removeEventListener("orientationchange", recompute); };
  }, [checked]);

  if (!checked) return null;

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div ref={containerRef} className="relative flex-1 min-h-0 w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/welcome-artwork.png"
          alt="Nivaar — Report. Resolve. Improve. AI-powered civic reporting for a cleaner, safer, better city."
          className="absolute inset-0 w-full h-full object-cover select-none nivaar-welcome-float"
          draggable={false}
        />
        <div className="absolute inset-0 pointer-events-none nivaar-welcome-vignette" />
        {btnRect && (
          <button
            type="button"
            aria-label="Get Started"
            onClick={() => router.push("/language")}
            className="absolute active:opacity-70 transition"
            style={{ left: btnRect.left, top: btnRect.top, width: btnRect.width, height: btnRect.height }}
          />
        )}
      </div>
    </div>
  );
}
