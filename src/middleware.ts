import { NextResponse, type NextRequest } from "next/server";
import {
  ACCESS_PATH,
  accessMode,
  accessPageHtml,
  accessToken,
  isValidAccessCookie,
  isValidCode,
  LOGOUT_PATH,
  NOINDEX_HEADER,
  PREVIEW_COOKIE,
  ROBOTS_DISALLOW_ALL,
  safeNextPath,
} from "@/lib/preview-access";

/**
 * Protection de la préproduction, CÔTÉ SERVEUR, appliquée à TOUTES les adresses (pages, API, vidéos simulées,
 * images, fichiers techniques du site) avant tout traitement. Voir src/lib/preview-access.ts pour la règle.
 */
export async function middleware(request: NextRequest) {
  const mode = accessMode(process.env);
  if (mode === "open" || mode === "public") {
    if (mode === "public") return NextResponse.next();
    return withNoIndex(NextResponse.next());
  }

  const { pathname } = request.nextUrl;
  const html = (body: string, status: number, extra: Record<string, string> = {}) =>
    withNoIndex(new NextResponse(body, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", ...extra } }));

  if (pathname === "/robots.txt") {
    return withNoIndex(new NextResponse(ROBOTS_DISALLOW_ALL, { headers: { "Content-Type": "text/plain; charset=utf-8" } }));
  }

  if (mode === "locked") {
    return html(accessPageHtml({ next: "/", locked: true }), 503, { "Retry-After": "3600" });
  }

  const code = process.env.PREVIEW_ACCESS_CODE!;

  if (pathname === ACCESS_PATH) {
    if (request.method !== "POST") return html(accessPageHtml({ next: "/" }), 401);
    const form = await request.formData().catch(() => null);
    const submitted = form?.get("code");
    const next = safeNextPath(form?.get("next"));
    if (typeof submitted === "string" && (await isValidCode(submitted, code))) {
      const res = NextResponse.redirect(new URL(next, request.url), 303);
      res.cookies.set(PREVIEW_COOKIE, await accessToken(code), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
      res.headers.set("Cache-Control", "no-store");
      return withNoIndex(res);
    }
    await new Promise((r) => setTimeout(r, 600)); // ralentit les essais de code à la chaîne
    return html(accessPageHtml({ next, error: true }), 401);
  }

  if (pathname === LOGOUT_PATH) {
    const res = NextResponse.redirect(new URL("/", request.url), 303);
    res.cookies.set(PREVIEW_COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    return withNoIndex(res);
  }

  if (await isValidAccessCookie(request.cookies.get(PREVIEW_COOKIE)?.value, code)) {
    return withNoIndex(NextResponse.next());
  }

  // Non authentifié : API → refus JSON ; tout le reste → page d'accès (aucun contenu du site).
  const wantsJson = pathname.startsWith("/api/") || request.method !== "GET";
  if (wantsJson) {
    return withNoIndex(
      NextResponse.json({ error: "preprod_access_required", message: "Accès réservé à la préproduction." }, { status: 401, headers: { "Cache-Control": "no-store" } }),
    );
  }
  return html(accessPageHtml({ next: safeNextPath(pathname + request.nextUrl.search) }), 401);
}

function withNoIndex(res: NextResponse): NextResponse {
  res.headers.set("X-Robots-Tag", NOINDEX_HEADER);
  return res;
}

// Toutes les adresses, sans exception (y compris les fichiers techniques du site et les images).
export const config = { matcher: "/:path*" };
