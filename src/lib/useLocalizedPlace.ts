"use client";
import { useEffect, useState } from "react";
import { reverseGeocode, formatPlace } from "@/lib/geocode";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

// Fixes: a report's address/landmark is reverse-geocoded once, at
// submission time, and stored as plain text — frozen in whatever language
// was selected back then. If the user later switches languages (or the
// report was created under a different language), the stored text does not
// update on its own; blindly rendering report.address would keep showing
// e.g. Kannada-script text even with English currently selected.
//
// This hook re-resolves a fresh, correctly-localized place name from the
// report's stored lat/lng using the CURRENTLY selected UI language. It
// shows the original stored text immediately (no loading flicker, no
// broken UI if offline) and silently upgrades to the live, language-correct
// version once it resolves. Works for any location — nothing hardcoded.
export function useLocalizedPlace(
  lat: number | undefined | null,
  lng: number | undefined | null,
  fallbackArea: string | undefined | null,
  fallbackFull: string | undefined | null
) {
  const { lang } = useLanguage();
  const [place, setPlace] = useState({ area: fallbackArea || "", full: fallbackFull || "" });

  useEffect(() => {
    let cancelled = false;
    setPlace({ area: fallbackArea || "", full: fallbackFull || "" });

    if (lat == null || lng == null) return;

    reverseGeocode(lat, lng, lang)
      .then((p) => {
        if (!cancelled) setPlace({ area: p.area, full: formatPlace(p) });
      })
      .catch(() => {
        // Network hiccup or offline — keep showing the stored text rather
        // than an error; nothing regresses versus current behavior.
      });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lng, lang]);

  return place;
}
