import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

export const runtime = "nodejs";

function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

const RADIUS_METERS = 250;

// POST /api/reports/duplicates — real geospatial + category matching against
// currently-open reports (excludes demo reports so a sample photo can never
// fake-match a real citizen's report).
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerSupabase();
    const { issueType, latitude, longitude } = await req.json();
    if (!issueType || latitude == null || longitude == null) {
      return NextResponse.json({ error: "issueType, latitude, longitude are required" }, { status: 400 });
    }

    // A tight bounding box first (cheap, index-friendly), then exact
    // haversine filtering in JS for correctness.
    const degreeRadius = RADIUS_METERS / 111000; // ~meters per degree latitude
    const { data, error } = await supabase
      .from("reports")
      .select("*")
      .eq("issue_type", issueType)
      .eq("is_demo", false)
      .neq("status", "Resolved")
      .gte("latitude", latitude - degreeRadius)
      .lte("latitude", latitude + degreeRadius)
      .gte("longitude", longitude - degreeRadius)
      .lte("longitude", longitude + degreeRadius);

    if (error) throw error;

    const matches = (data || [])
      .map((r) => ({ report: r, distance: haversineMeters({ lat: latitude, lng: longitude }, { lat: r.latitude, lng: r.longitude }) }))
      .filter((m) => m.distance <= RADIUS_METERS)
      .sort((a, b) => a.distance - b.distance);

    return NextResponse.json({ matches });
  } catch (err: any) {
    console.error("[duplicates] error:", err);
    // Per spec: if duplicate detection fails, allow the report to continue
    // rather than blocking the user.
    return NextResponse.json({ matches: [], degraded: true });
  }
}
