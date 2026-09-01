// Modular authority-routing layer. This is a real, extensible mapping table —
// NOT a fake government API integration. No official authority API exists
// today, so routed reports simply carry a suggested `department`/`authority`
// pair for the admin dashboard to act on manually.
//
// To add another city: add a new table keyed by city name and pick it based
// on report.address / a city selector at report time.

export const AUTHORITY_ROUTING_TABLE_BENGALURU: Record<string, { department: string; authority: string }> = {
  "Pothole": { department: "Roads", authority: "BBMP — Roads & Infrastructure" },
  "Road/infrastructure damage": { department: "Roads", authority: "BBMP — Roads & Infrastructure" },
  "Broken streetlight": { department: "Electrical", authority: "BESCOM — Street Lighting Division" },
  "Garbage/waste issue": { department: "Sanitation", authority: "BBMP — Solid Waste Management" },
  "Water leakage": { department: "Water Supply", authority: "BWSSB — Water & Sewerage" },
  "Drainage issue": { department: "Drainage", authority: "BWSSB — Water & Sewerage" },
  "Other": { department: "General", authority: "Unclear — needs manual routing" },
};

export function resolveAuthority(issueType: string, city: string = "Bengaluru") {
  const table = city === "Bengaluru" ? AUTHORITY_ROUTING_TABLE_BENGALURU : AUTHORITY_ROUTING_TABLE_BENGALURU;
  return table[issueType] ?? table["Other"];
}

export const ISSUE_TYPES = [
  "Pothole",
  "Water leakage",
  "Garbage/waste issue",
  "Broken streetlight",
  "Drainage issue",
  "Road/infrastructure damage",
  "Other",
] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_EMOJI: Record<string, string> = {
  "Pothole": "🕳️",
  "Water leakage": "💧",
  "Garbage/waste issue": "🗑️",
  "Broken streetlight": "💡",
  "Drainage issue": "🌊",
  "Road/infrastructure damage": "🚧",
  "Other": "❗",
};
