// Design tokens ported 1:1 from the original Nivaar prototype (neo-brutalist
// direction: bold flat colors, hard offset shadows, thick borders, chunky
// rounded type). Kept in one place so the whole app stays visually
// consistent with what you already approved.

export const T = {
  ink: "#161A2E", inkSoft: "#66677E", bg: "#FFF8EC", card: "#FFFFFF", line: "#F0E6D2",
  green: "#00C773", greenDeep: "#00915A", greenTint: "#DEFBEC",
  amber: "#FF9F1C", amberTint: "#FFEFD6",
  rust: "#FF5A4E", rustTint: "#FFE4E1",
  sage: "#9C9CB8",
  blue: "#3E9DFF", blueTint: "#E1F0FF",
  purple: "#8B5CF6", purpleTint: "#EFE7FE",
  sun: "#FFC845",
} as const;

export const CATEGORY_COLORS: Record<string, string> = {
  "Pothole": T.rust,
  "Road/infrastructure damage": T.rust,
  "Broken streetlight": T.sun,
  "Garbage/waste issue": T.green,
  "Water leakage": T.blue,
  "Drainage issue": T.blue,
  "Other": T.purple,
};

export function categoryColor(issueType?: string | null): string {
  return (issueType && CATEGORY_COLORS[issueType]) || T.green;
}
export function chipBg(issueType?: string | null): string {
  return categoryColor(issueType) + "22";
}

export function severityTone(severity?: string | null): "rust" | "amber" | "neutral" {
  if (severity === "High") return "rust";
  if (severity === "Medium") return "amber";
  return "neutral";
}
