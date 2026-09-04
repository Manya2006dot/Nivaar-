// Shared reverse-geocoding utility. Used both at report-creation time
// (src/app/report/page.tsx) and for re-localizing already-stored reports'
// addresses on the details/tracking page (src/lib/useLocalizedPlace.ts).
//
// Nominatim picks a response language using its own heuristics when no
// accept-language is given — often the script associated with the
// coordinates' region — completely independent of Nivaar's selected UI
// language. Passing accept-language ties the result to the app's actual
// selected language every time.

export interface PlaceName { area: string; cityLine: string; }

export async function reverseGeocode(lat: number, lng: number, uiLang: string): Promise<PlaceName> {
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&accept-language=${uiLang}`);
  if (!res.ok) throw new Error("reverse geocode failed");
  const data = await res.json();
  const a = data.address || {};
  const area = a.suburb || a.neighbourhood || a.village || a.town || a.city_district || "Your area";
  const city = a.city || a.town || a.state_district || "";
  const state = a.state || "";
  return { area, cityLine: [city, state].filter(Boolean).join(", ") || data.display_name || "" };
}

export function formatPlace(p: PlaceName): string {
  return [p.area, p.cityLine].filter(Boolean).join(", ");
}
