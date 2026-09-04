// Design tokens — playful civic-tech direction: one consistent purple as the
// brand color, warm yellow reserved for primary CTAs, vibrant accent colors,
// white/cream background, soft shadows, generous rounding.
// Every screen imports from here so the palette can never drift between
// screens — change a value here and the whole app follows.
//
// Brightened to match the Welcome screen's energy: same identity (purple /
// yellow / green / coral / blue), meaningfully more saturated than the
// original pastel pass, while keeping every *Tint background + *Deep text
// pairing at a contrast ratio that stays comfortably readable (not neon,
// not washed out).

export const T = {
  ink: "#211A38", inkSoft: "#5B547A", bg: "#FFF8EC", card: "#FFFFFF", line: "#F0E4FB",

  // The ONE purple used everywhere — vibrant, matches the Welcome screen's CTA.
  purple: "#6C3FC5", purpleDeep: "#4A2E8C", purpleTint: "#EAE1FB",

  // Warm golden yellow — reserved for primary CTAs (submit button) + bottom nav.
  yellow: "#FFC01F", yellowDeep: "#C98A00", yellowTint: "#FFF1D2",

  // Severity / status accents — vivid but not neon.
  green: "#22B573", greenDeep: "#12804F", greenTint: "#DFF6EA",
  amber: "#FF9500", amberDeep: "#C96F00", amberTint: "#FFEACC",
  rust: "#FF5A3C", rustDeep: "#D93F24", rustTint: "#FFE0D9",
  blue: "#2E9CE0", blueDeep: "#1B76B3", blueTint: "#DDF0FC",

  sage: "#8E86AE",
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
