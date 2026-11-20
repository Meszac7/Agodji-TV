/**
 * Protection de la PRÉPRODUCTION (étape L2) — logique pure, compatible avec le moteur « edge » du middleware.
 *
 * Règle (fermée par défaut) :
 * - APP_ENV = development ou test  → ouvert (postes de développement, tests automatiques) ;
 * - APP_ENV = production           → public (futur site de production) ;
 * - toute autre valeur (preview, absente, inconnue) → PROTÉGÉ par code d'accès ;
 *   si le code n'est pas configuré (ou trop court), le site est VERROUILLÉ : rien n'est servi.
 */
export type AccessMode = "open" | "public" | "protected" | "locked";

export const PREVIEW_COOKIE = "agodjie_preprod";
export const ACCESS_PATH = "/__preprod/acces";
export const LOGOUT_PATH = "/__preprod/sortie";
export const MIN_CODE_LENGTH = 16;
const COOKIE_CONTEXT = "agodjie-preprod-v1";

export function accessMode(env: Record<string, string | undefined>): AccessMode {
  const appEnv = env.APP_ENV;
  if (appEnv === "development" || appEnv === "test") return "open";
  if (appEnv === "production") return "public";
  const code = env.PREVIEW_ACCESS_CODE ?? "";
  return code.length >= MIN_CODE_LENGTH ? "protected" : "locked";
}

/** Préproduction : mention visible, titre préfixé, aucune indexation. */
export function isPreviewEnv(env: Record<string, string | undefined>): boolean {
  const mode = accessMode(env);
  return mode === "protected" || mode === "locked";
}

function toBase64Url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(key: string, message: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(message)));
}

/** Comparaison à temps constant (SEC-32). */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Valeur du cookie d'accès : signature dérivée du code (le code lui-même n'est jamais stocké chez le visiteur).
 * Changer le code d'accès invalide immédiatement tous les cookies existants.
 */
export function accessToken(code: string): Promise<string> {
  return hmac(code, COOKIE_CONTEXT);
}

export async function isValidAccessCookie(cookieValue: string | undefined, code: string): Promise<boolean> {
  if (!cookieValue) return false;
  return safeEqual(cookieValue, await accessToken(code));
}

/** Code saisi correct ? (comparaison de signatures, à temps constant) */
export async function isValidCode(submitted: string, code: string): Promise<boolean> {
  if (!submitted || submitted.length > 512) return false;
  const [a, b] = await Promise.all([hmac(code, `code:${submitted}`), hmac(code, `code:${code}`)]);
  return safeEqual(a, b);
}

/** Destination après saisie du code : chemin interne uniquement (pas de redirection vers un autre site). */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (next.startsWith("/__preprod/")) return "/";
  return /^[\x20-\x7e]{1,512}$/.test(next) ? next : "/";
}

export const ROBOTS_DISALLOW_ALL = "User-agent: *\nDisallow: /\n";
export const NOINDEX_HEADER = "noindex, nofollow, noarchive, nosnippet";

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Page d'accès autonome (aucun fichier externe : rien du site n'est servi avant la saisie du code). */
export function accessPageHtml(options: { next: string; error?: boolean; locked?: boolean }): string {
  const body = options.locked
    ? `<p>Cette préproduction n'est pas encore configurée : elle reste fermée.</p>`
    : `<form method="post" action="${ACCESS_PATH}">
        <input type="hidden" name="next" value="${escapeHtml(options.next)}">
        <label for="code">Code d'accès</label>
        <input id="code" name="code" type="password" autocomplete="current-password" required autofocus>
        ${options.error ? `<p class="err" role="alert">Code incorrect.</p>` : ""}
        <button type="submit">Entrer</button>
      </form>`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>[Préprod] Accès restreint · Agodjié TV</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0b0f;color:#f5f3ef;font-family:system-ui,sans-serif}
main{width:min(360px,calc(100vw - 32px))}h1{font-size:22px;margin:0 0 4px}.tag{display:inline-block;background:#f2b705;color:#141414;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}
label{display:block;margin:20px 0 6px;font-size:14px;color:#b9b4ab}input[type=password]{box-sizing:border-box;width:100%;padding:12px;border-radius:10px;border:1px solid #3a3a44;background:#17171d;color:inherit;font-size:16px}
button{margin-top:14px;width:100%;padding:12px;border:0;border-radius:10px;background:#f2b705;color:#141414;font-weight:700;font-size:16px}.err{color:#ff6b6b;margin:10px 0 0}</style></head>
<body><main><span class="tag">Préproduction · données de démonstration</span><h1>Agodjié TV — accès restreint</h1>${body}</main></body></html>`;
}
