// The project has no pre-existing logo asset (checked /public — empty), so
// this is the canonical Nivaar mark going forward: a map-pin silhouette
// (civic/location metaphor) holding a bold "N", on a soft golden halo,
// matching the reference image as closely as a scalable SVG allows.
export function NivaarLogo({ size = 120 }: { size?: number }) {
  return (
    <svg width={size} height={size * 1.02} viewBox="0 0 120 122" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="58" r="56" fill="url(#nivaar-halo)" />
      <path
        d="M60 14C40.67 14 25 29.67 25 49c0 27 35 58 35 58s35-31 35-58c0-19.33-15.67-35-35-35Z"
        fill="url(#nivaar-pin)"
      />
      <circle cx="60" cy="49" r="21" fill="#FFFFFF" fillOpacity="0.08" />
      <path d="M49 39v20h5.4V47.2L62.4 59H68V39h-5.4v11.8L54.6 39H49Z" fill="#fff" />
      <circle cx="72" cy="34" r="3.4" fill="#FFC94A" />
      <defs>
        <radialGradient id="nivaar-halo" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 58) rotate(90) scale(56)">
          <stop stopColor="#FFD866" />
          <stop offset="1" stopColor="#FFD866" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nivaar-pin" x1="25" y1="14" x2="95" y2="107" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6C3FC5" />
          <stop offset="1" stopColor="#3E1F80" />
        </linearGradient>
      </defs>
    </svg>
  );
}
