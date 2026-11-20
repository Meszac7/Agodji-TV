import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { isPreviewEnv } from "@/lib/preview-access";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const preview = isPreviewEnv(process.env);
  return {
    title: preview
      ? { default: "[Préprod] Agodjié TV", template: "[Préprod] %s · Agodjié TV" }
      : { default: "Agodjié TV", template: "%s · Agodjié TV" },
    description: "Séries dramatiques africaines à regarder en streaming.",
    // Préproduction : jamais indexée (en plus de l'en-tête X-Robots-Tag et de robots.txt).
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0b0f",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const preview = isPreviewEnv(process.env);
  return (
    <html lang="fr" data-theme={theme}>
      <body className={preview ? "pt-5" : undefined}>
        {preview ? (
          // Toujours au premier plan (même au-dessus du lecteur), sans gêner les gestes.
          <div
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] flex h-5 items-center justify-center bg-primary text-[11px] font-bold tracking-wide text-on-primary"
            data-testid="preprod-banner"
          >
            Préproduction · données de démonstration
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
