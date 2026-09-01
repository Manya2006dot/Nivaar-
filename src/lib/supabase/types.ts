// Hand-written types matching supabase/schema.sql.
// (For larger projects, generate these with `supabase gen types typescript`.)

export type ReportStatus =
  | "Submitted"
  | "Acknowledged"
  | "Assigned"
  | "In Progress"
  | "Resolved";

export type Severity = "Low" | "Medium" | "High";

export interface Report {
  id: string;
  report_number: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  voice_url: string | null;
  voice_transcript: string | null;
  issue_type: string;
  ai_confidence: number | null;
  severity: Severity;
  ai_explanation: string | null;
  description: string;
  latitude: number;
  longitude: number;
  address: string | null;
  landmark: string | null;
  department: string | null;
  authority: string | null;
  status: ReportStatus;
  affected_count: number;
  duplicate_of: string | null;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface StatusHistoryRow {
  id: string;
  report_id: string;
  status: ReportStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface ResolutionImageRow {
  id: string;
  report_id: string;
  image_url: string;
  ai_verification: { looksResolved: boolean; confidence: number; note: string } | null;
  created_at: string;
}

export interface Profile {
  id: string;
  preferred_language: string;
  is_admin: boolean;
  created_at: string;
}
