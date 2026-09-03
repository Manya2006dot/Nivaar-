// Lightweight, fully-vector approximation of the reference's park/city
// illustration: skyline silhouettes, foliage blobs, a streetlamp on each
// side, a bench. No raster assets — scales cleanly at any size, costs
// nothing to load, and stays visually consistent with the rest of the app's
// icon system.
export function ParkScene() {
  return (
    <svg viewBox="0 0 430 360" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full" preserveAspectRatio="xMidYMax slice">
      {/* distant skyline */}
      <g opacity="0.22">
        {[
          [8, 210, 34, 90], [46, 180, 30, 120], [340, 195, 32, 105], [382, 165, 34, 135],
        ].map(([x, y, w, h], i) => (
          <rect key={i} x={x} y={y} width={w} height={h} rx="4" fill="#F2C744" />
        ))}
      </g>
      {/* foliage blobs */}
      <ellipse cx="55" cy="300" rx="90" ry="70" fill="#B7E4A8" opacity="0.55" />
      <ellipse cx="375" cy="300" rx="95" ry="72" fill="#B7E4A8" opacity="0.55" />
      <ellipse cx="20" cy="330" rx="70" ry="45" fill="#8FCB79" opacity="0.5" />
      <ellipse cx="410" cy="330" rx="75" ry="48" fill="#8FCB79" opacity="0.5" />

      {/* left streetlamp */}
      <g opacity="0.85">
        <rect x="46" y="200" width="4" height="110" rx="2" fill="#3D3350" />
        <circle cx="48" cy="196" r="11" fill="#FFDE85" />
        <circle cx="48" cy="196" r="17" fill="#FFDE85" opacity="0.35" />
      </g>
      {/* right streetlamp */}
      <g opacity="0.85">
        <rect x="380" y="180" width="4" height="110" rx="2" fill="#3D3350" />
        <circle cx="382" cy="176" r="11" fill="#FFDE85" />
        <circle cx="382" cy="176" r="17" fill="#FFDE85" opacity="0.35" />
      </g>

      {/* bench, bottom-left */}
      <g opacity="0.9" transform="translate(30,300)">
        <rect x="0" y="18" width="70" height="7" rx="3" fill="#C97B3D" />
        <rect x="0" y="30" width="70" height="7" rx="3" fill="#C97B3D" />
        <rect x="4" y="8" width="62" height="6" rx="3" fill="#B96A2E" />
        <rect x="2" y="24" width="6" height="20" fill="#3D3350" />
        <rect x="62" y="24" width="6" height="20" fill="#3D3350" />
      </g>

      {/* path */}
      <path d="M0 340 Q120 300 215 320 T430 335 V360 H0 Z" fill="#F5DFA0" opacity="0.5" />

      {/* birds */}
      <path d="M60 60 q6-8 12 0 q6-8 12 0" stroke="#3D3350" strokeWidth="2.4" fill="none" opacity="0.4" strokeLinecap="round" />
      <path d="M330 40 q5-7 10 0 q5-7 10 0" stroke="#3D3350" strokeWidth="2.2" fill="none" opacity="0.35" strokeLinecap="round" />
    </svg>
  );
}
