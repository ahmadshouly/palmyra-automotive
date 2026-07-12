import { readFile, stat } from "node:fs/promises";
import path from "node:path";

// Serve user-uploaded files (listing photos, banner) from disk at request time.
// Next.js only serves files that existed in `public/` at build time, so photos
// imported/uploaded after a build would otherwise 404. This handler covers them.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif": "image/gif",
};

export async function GET(_req: Request, { params }: { params: { path: string[] } }) {
  const relative = (params.path ?? []).join("/");
  const filePath = path.normalize(path.join(UPLOADS_DIR, relative));

  // Prevent path traversal outside the uploads directory.
  if (filePath !== UPLOADS_DIR && !filePath.startsWith(UPLOADS_DIR + path.sep)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) return new Response("Not found", { status: 404 });

    const ext = path.extname(filePath).toLowerCase();
    const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
    const data = await readFile(filePath);

    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(info.size),
        "Cache-Control": "public, max-age=604800, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
