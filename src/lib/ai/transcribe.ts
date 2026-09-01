// Server-only speech-to-text. Default implementation uses OpenAI's Whisper
// API via STT_API_KEY. Swap this file's implementation to use a different
// provider (Deepgram, Google STT, etc.) without touching any caller —
// everything else in the app talks to `transcribeAudio()` only.

export async function transcribeAudio(audioBlob: Blob, filename: string): Promise<string> {
  const apiKey = process.env.STT_API_KEY;
  if (!apiKey) {
    throw new Error(
      "STT_API_KEY is not set. Add an OpenAI API key to .env.local, or swap " +
        "the implementation in src/lib/ai/transcribe.ts for a different provider."
    );
  }

  const form = new FormData();
  form.append("file", audioBlob, filename);
  form.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Transcription failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return (data.text || "").trim();
}
