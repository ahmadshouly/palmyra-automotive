import { NextRequest } from "next/server";

function hash(str: string) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = (h * 33) ^ str.charCodeAt(i);
  return Math.abs(h);
}

const PALETTES: [string, string][] = [
  ["#1e3a8a", "#3b82f6"],
  ["#0f766e", "#2dd4bf"],
  ["#7c2d12", "#fb923c"],
  ["#4c1d95", "#a78bfa"],
  ["#831843", "#f472b6"],
  ["#14532d", "#4ade80"],
  ["#1e293b", "#64748b"],
  ["#713f12", "#facc15"],
];

/** Deterministic SVG vehicle placeholder — keeps the demo fully offline. */
export function GET(req: NextRequest) {
  const label = req.nextUrl.searchParams.get("label")?.slice(0, 60) ?? "Vehicle";
  const seed = req.nextUrl.searchParams.get("seed") ?? label;
  const [from, to] = PALETTES[hash(seed) % PALETTES.length];
  const safeLabel = label.replace(/[<>&"']/g, "");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#g)"/>
  <g transform="translate(220,180)" fill="rgba(255,255,255,0.9)">
    <path d="M40 120 C60 70 110 45 180 45 C250 45 290 65 320 100 L360 105 C380 108 390 118 390 132 L390 150 C390 158 384 164 376 164 L340 164 A38 38 0 0 1 264 164 L136 164 A38 38 0 0 1 60 164 L24 164 C16 164 10 158 10 150 L10 140 C10 130 22 124 40 120 Z"/>
    <circle cx="98" cy="164" r="26" fill="${from}"/>
    <circle cx="302" cy="164" r="26" fill="${from}"/>
    <path d="M120 100 C140 65 175 58 185 58 L185 100 Z M205 58 C255 58 285 75 300 100 L205 100 Z" fill="${from}" opacity="0.55"/>
  </g>
  <text x="400" y="420" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="30" font-weight="700" fill="rgba(255,255,255,0.95)">${safeLabel}</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
