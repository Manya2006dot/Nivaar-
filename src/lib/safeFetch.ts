// Defensive response parsing for every client -> API call. The direct
// trigger for the mobile bug: the server (or the platform in front of it —
// e.g. Vercel's request body size limit) can return a plain-text or HTML
// response instead of JSON (a 413, a proxy error page, etc). Calling
// response.json() directly on that throws a confusing
// "Unexpected token 'R', "Request En"... is not valid JSON" exception.
// This wraps every fetch so failures always surface as a clean, readable
// Error instead.

export async function parseJsonResponse(res: Response): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  const text = await res.text().catch(() => "");
  const snippet = text.slice(0, 140).replace(/\s+/g, " ").trim();
  throw new Error(`Server returned an unexpected response (${res.status}): ${snippet || res.statusText || "empty body"}`);
}

export async function postJson(url: string, body: any): Promise<any> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export async function postForm(url: string, form: FormData): Promise<any> {
  const res = await fetch(url, { method: "POST", body: form });
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}

export async function getJson(url: string): Promise<any> {
  const res = await fetch(url);
  const data = await parseJsonResponse(res);
  if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);
  return data;
}
