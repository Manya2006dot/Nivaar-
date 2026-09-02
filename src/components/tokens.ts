// Design tokens — playful civic-tech direction: one consistent soft/muted
// purple as the brand color, warm yellow reserved for primary CTAs, pastel
// accent colors, white/cream background, soft shadows, generous rounding.
// Every screen imports from here so the palette can never drift between
// screens — change a value here and the whole app follows.

export const T = {
  ink: "#2B2540", inkSoft: "#746E8C", bg: "#FFFBF3", card: "#FFFFFF", line: "#F0E9FB",

  // The ONE purple used everywhere — medium/muted, never neon.
  purple: "#8B7FD1", purpleDeep: "#6C5FB8", purpleTint: "#EFEBFB",

  // Warm yellow — reserved for primary CTAs (submit button) + bottom nav.
  yellow: "#FFC94A", yellowDeep: "#E8A619", yellowTint: "#FFF3D9",

  // Severity / status accents — pastel, not neon.
  green: "#5CC98E", greenDeep: "#379A67", greenTint: "#E4F8ED",
  amber: "#FFA552", amberDeep: "#D97C1F", amberTint: "#FFEEDD",
  rust: "#FF8B7B", rustDeep: "#E85C48", rustTint: "#FFE7E2",
  blue: "#7FB8E8", blueDeep: "#4A8FC7", blueTint: "#E7F2FC",

  sage: "#B4AECB",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Pothole": T.rust,
  "Road/infrastructure damage": T.rust,
  "Broken streetlight": T.amber,
  "Garbage/waste issue": T.green,
  "Water leakage": T.blue,
  "Drainage issue": T.blue,
  "Other": T.purple,
};

export function categoryColor(issueType?: string | null): string {
  return (issueType && CATEGORY_COLORS[issueType]) || T.purple;
}
export function chipBg(issueType?: string | null): string {
  return categoryColor(issueType) + "26";
}

export function severityTone(severity?: string | null): "rust" | "amber" | "green" {
  if (severity === "High") return "rust";
  if (severity === "Medium") return "amber";
  return "green";
}

// Soft, friendly card shadow used consistently across the app — one shadow
// recipe everywhere, per the consistency requirement.
export const SOFT_SHADOW = "0 8px 20px -8px rgba(139,127,209,0.25)";
export function tintShadow(hex: string) {
  return `0 8px 20px -8px ${hex}40`;
}
