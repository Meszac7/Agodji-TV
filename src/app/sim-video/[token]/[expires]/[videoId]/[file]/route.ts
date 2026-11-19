import { readFile } from "node:fs/promises";
import path from "node:path";
import { getVideoSimulator } from "@/server/providers/video";

export const dynamic = "force-dynamic";

const TYPES: Record<string, string> = {
  m3u8: "application/vnd.apple.mpegurl",
  m4s: "video/iso.segment",
  mp4: "video/mp4",
};

/**
 * « CDN » du simulateur vidéo (développement et préproduction UNIQUEMENT).
 * Vérifie le jeton du chemin à chaque fichier, comme l'authentification par jeton de Bunny Stream.
 * En production (ou si un autre fournisseur est configuré) : 404, aucun fichier servi.
 */
export async function GET(_request: Request, context: { params: Promise<{ token: string; expires: string; videoId: string; file: string }> }) {
  let simulator;
  try {
    simulator = getVideoSimulator();
  } catch {
    simulator = undefined;
  }
  if (!simulator) return new Response("Introuvable", { status: 404 });

  const { token, expires, videoId, file } = await context.params;
  if (!/^[0-9a-f]{64}$/.test(token) || !/^\d{1,12}$/.test(expires) || !/^demo-[a-z0-9-]{1,40}$/.test(videoId) || !/^[a-z0-9-]{1,60}\.(m3u8|m4s|mp4)$/.test(file)) {
    return new Response("Introuvable", { status: 404 });
  }
  if (!simulator.verify(videoId, token, Number(expires))) {
    return new Response("Lien expiré ou invalide", { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const data = await readFile(path.join(process.cwd(), "demo-media", "hls", videoId, file));
    const ext = file.split(".").pop()!;
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": TYPES[ext]!,
        "Cache-Control": ext === "m3u8" ? "no-store" : "private, max-age=300",
        "Cross-Origin-Resource-Policy": "same-origin",
      },
    });
  } catch {
    return new Response("Introuvable", { status: 404 });
  }
}
