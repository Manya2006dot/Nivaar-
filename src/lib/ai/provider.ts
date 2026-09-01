import { ISSUE_TYPES } from "@/lib/routing";

// Server-only. This key must never reach the browser — this file must only
// ever be imported from files under src/app/api/**.
//
// Uses OpenAI (chat completions + vision) for classification and report
// composition. Falls back to STT_API_KEY if AI_API_KEY isn't set separately,
// since most setups use the same OpenAI key for both.
const OPENAI_API_KEY = process.env.AI_API_KEY || process.env.STT_API_KEY;
const MODEL = process.env.AI_MODEL || "gpt-4o";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

async function openaiChat(messages: any[], opts: { json?: boolean; maxTokens?: number } = {}) {
  if (!OPENAI_API_KEY) {
    throw new Error("AI_API_KEY (or STT_API_KEY) is not set. Add your OpenAI API key to .env.local.");
  }
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: opts.maxTokens ?? 800,
      ...(opts.json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`OpenAI request failed (${res.status}): ${errText}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content in OpenAI response");
  return content as string;
}

export interface ClassificationResult {
  isCivicIssue: boolean;
  issueType: string;
  confidence: number; // 0-100
  severity: "Low" | "Medium" | "High";
  explanation: string;
  description: string; // draft complaint description, {location} placeholder inside
}

const CLASSIFY_PROMPT = `You are Nivaar, an AI that looks at a photo of a civic/municipal problem and classifies it for a citizen reporting app.

Look carefully at the photo and respond with ONLY a raw JSON object — no markdown fences, no extra text. Use exactly this shape:

{
  "isCivicIssue": true or false,
  "issueType": one of ${JSON.stringify(ISSUE_TYPES)},
  "confidence": integer 0-100, your honest calibrated confidence (use below 65 if the photo is ambiguous, blurry, or could be more than one thing),
  "severity": "Low" | "Medium" | "High",
  "explanation": "one short sentence on why you classified it this way",
  "description": "a concise, professional 2-3 sentence complaint description suitable to send to a civic authority, written in third person. Use the exact placeholder {location} once, wherever the location should be mentioned."
}

If the photo does not show a real civic issue, set isCivicIssue to false, still give your best-guess issueType/description, and use a low confidence.`;

export async function classifyImage(base64: string, mediaType: string): Promise<ClassificationResult> {
  const content = await openaiChat(
    [
      {
        role: "user",
        content: [
          { type: "text", text: CLASSIFY_PROMPT },
          { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
        ],
      },
    ],
    { json: true, maxTokens: 800 }
  );

  const clean = content.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  const parsed = JSON.parse(clean);

  return {
    isCivicIssue: parsed.isCivicIssue !== false,
    issueType: ISSUE_TYPES.includes(parsed.issueType) ? parsed.issueType : "Other",
    confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : 50,
    severity: ["Low", "Medium", "High"].includes(parsed.severity) ? parsed.severity : "Medium",
    explanation: parsed.explanation || "",
    description: parsed.description || "An issue was reported near {location}.",
  };
}

// Combines the image classification with an optional voice-note transcript
// (per product requirement #8) into one final, polished complaint
// description. Called from /api/ai/compose after classify + (optional)
// transcribe have both run.
export async function composeReport(input: {
  issueType: string;
  severity: string;
  imageDescription: string;
  voiceTranscript?: string;
  location: string;
}): Promise<string> {
  const prompt = `Write a concise, professional 2-4 sentence civic complaint description for a "${input.issueType}" issue (severity: ${input.severity}) near ${input.location}.

Base description from image analysis: "${input.imageDescription}"
${input.voiceTranscript ? `Additional detail the citizen spoke aloud: "${input.voiceTranscript}"` : ""}

Combine both sources into one coherent, third-person complaint description a civic authority would receive. Do not invent facts not present in either source. Respond with ONLY the description text, no preamble, no quotes.`;

  const content = await openaiChat([{ role: "user", content: prompt }], { maxTokens: 400 });
  return content.trim();
}

// Basic before/after resolution verification (product requirement #19).
// Deliberately conservative in its own framing — this is a "best guess AI
// assessment," never a claim of ground truth, per the product's transparency
// requirements.
export async function verifyResolution(beforeBase64: string, beforeMediaType: string, afterBase64: string, afterMediaType: string, issueType: string) {
  const prompt = `You are comparing a BEFORE and AFTER photo of a reported "${issueType}" civic issue. Respond with ONLY raw JSON: {"looksResolved": boolean, "confidence": integer 0-100, "note": "one short sentence explaining your assessment"}. Be honest — if you can't tell, say so with low confidence.`;

  const content = await openaiChat(
    [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "text", text: "BEFORE:" },
          { type: "image_url", image_url: { url: `data:${beforeMediaType};base64,${beforeBase64}` } },
          { type: "text", text: "AFTER:" },
          { type: "image_url", image_url: { url: `data:${afterMediaType};base64,${afterBase64}` } },
        ],
      },
    ],
    { json: true, maxTokens: 300 }
  );

  const clean = content.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(clean) as { looksResolved: boolean; confidence: number; note: string };
}
