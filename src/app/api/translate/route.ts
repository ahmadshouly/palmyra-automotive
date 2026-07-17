export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Splits text into chunks under the free MyMemory per-request limit (~500 bytes),
// preferring to break on sentence/word boundaries.
function chunk(text: string, max = 450): string[] {
  const parts: string[] = [];
  let rest = text.trim();
  while (rest.length > max) {
    let cut = rest.lastIndexOf(". ", max);
    if (cut < max * 0.5) cut = rest.lastIndexOf(" ", max);
    if (cut <= 0) cut = max;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateChunk(text: string, langpair: string): Promise<string> {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${langpair}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("translate service error");
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (typeof out !== "string" || !out) throw new Error("empty translation");
  return out;
}

export async function POST(req: Request) {
  let body: { text?: string; source?: string; target?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const text = (body.text ?? "").trim();
  if (!text) return Response.json({ error: "No text provided" }, { status: 400 });
  if (text.length > 5000) return Response.json({ error: "Text too long" }, { status: 400 });

  const target = body.target === "en" ? "en" : "ar";
  const source = body.source === "ar" ? "ar" : "en";
  const langpair = `${source}|${target}`;

  try {
    const pieces = chunk(text);
    const translated = await Promise.all(pieces.map((p) => translateChunk(p, langpair)));
    return Response.json({ translation: translated.join(" ") });
  } catch {
    return Response.json({ error: "Translation failed. Please try again." }, { status: 502 });
  }
}
