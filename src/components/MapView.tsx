"use client";
import { useEffect, useRef, useState } from "react";
import { T } from "@/components/tokens";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export interface MapMarker { lat: number; lng: number; color: string; big?: boolean; data?: any; }

function useLeaflet() {
  const [ready, setReady] = useState(typeof window !== "undefined" && !!(window as any).L);
  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    const done = () => { if (!cancelled) setReady(true); };
    if ((window as any).L) { done(); return; }
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css";
      document.head.appendChild(link);
    }
    let script = document.getElementById("leaflet-js") as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = "leaflet-js";
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
      script.async = true;
      script.onload = done;
      document.body.appendChild(script);
    } else script.addEventListener("load", done);
    return () => { cancelled = true; };
  }, [ready]);
  return ready;
}

function pinIcon(L: any, color: string, big?: boolean) {
  const size = big ? 34 : 22;
  return L.divIcon({ className: "", html: `<div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${color};border:2.5px solid #fff;box-shadow:0 4px 10px -2px rgba(0,0,0,0.4);"></div>`, iconSize: [size, size], iconAnchor: [size / 2, size] });
}
function dotIcon(L: any, color: string) {
  return L.divIcon({ className: "", html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2.5px solid #fff;box-shadow:0 3px 8px -2px rgba(0,0,0,0.45);"></div>`, iconSize: [16, 16], iconAnchor: [8, 8] });
}

function LeafletMap({ height, center, zoom = 15, markers = [], onMarkerClick }: { height: number; center: { lat: number; lng: number }; zoom?: number; markers?: MapMarker[]; onMarkerClick?: (m: MapMarker) => void }) {
  const ready = useLeaflet();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!ready || !containerRef.current || mapRef.current) return;
    const L = (window as any).L;
    const map = L.map(containerRef.current, { zoomControl: false, scrollWheelZoom: false, attributionControl: false }).setView([center.lat, center.lng], zoom);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", { subdomains: "abcd", maxZoom: 19 }).addTo(map);
    markers.forEach((m) => {
      const icon = m.big ? pinIcon(L, m.color, true) : dotIcon(L, m.color);
      const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
      if (onMarkerClick) marker.on("click", () => onMarkerClick(m));
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 120);
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} style={{ width: "100%", height, background: T.greenTint }} />
      {!ready && <div className="absolute inset-0 flex items-center justify-center" style={{ height }}><div style={{ color: T.green }}>Loading map…</div></div>}
      <div className="absolute bottom-1.5 right-2 px-1.5 py-0.5 rounded text-[8.5px]" style={{ background: "rgba(255,255,255,0.75)", color: T.inkSoft }}>© OpenStreetMap</div>
    </div>
  );
}

export function MapView(props: { height: number; center: { lat: number; lng: number }; zoom?: number; markers?: MapMarker[]; onMarkerClick?: (m: MapMarker) => void }) {
  // Google Maps variant intentionally omitted here for brevity of the
  // scaffold — the free Leaflet/CARTO map above is fully functional with no
  // API key. If NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is set and you want the
  // Google-backed map, port the GoogleMapView component from the original
  // prototype artifact (same props contract as this component).
  return <LeafletMap {...props} />;
}
