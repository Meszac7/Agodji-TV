import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { EpisodeCard } from "@/components/catalog/EpisodeCard";
import { Hero } from "@/components/catalog/Hero";
import { PosterCard } from "@/components/catalog/PosterCard";
import { Wordmark } from "@/components/brand/Wordmark";
import { BottomNavPreview } from "@/components/layout/BottomNav";
import { PlayerPreview } from "@/components/player/PlayerPreview";
import { PurchaseSheetPreview } from "@/components/purchase/PurchaseSheetPreview";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AlertIcon, PlayIcon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { demoEpisodes, demoPricing, demoSeries } from "@/lib/demo/catalog";
import { isProduction } from "@/lib/env";
import { formatPrice } from "@/lib/money";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata: Metadata = { title: "Guide de style", robots: { index: false } };

const swatches = [
  { token: "--bg", label: "Fond", dark: "#0B0B0F", light: "#FAF8F4" },
  { token: "--surface", label: "Surface", dark: "#16161D", light: "#FFFFFF" },
  { token: "--surface-raised", label: "Surface surélevée", dark: "#20202A", light: "#FFFFFF" },
  { token: "--border", label: "Bordure", dark: "#2A2A35", light: "#E4E0D8" },
  { token: "--text", label: "Texte", dark: "#F5F3EE", light: "#15141A" },
  { token: "--text-muted", label: "Texte secondaire", dark: "#A8A5B3", light: "#5C5966" },
  { token: "--primary", label: "Jaune royal — action principale", dark: "#F5B800", light: "#F5B800" },
  { token: "--primary-text", label: "Jaune en texte", dark: "#F5B800", light: "#8A6400" },
  { token: "--danger-solid", label: "Rouge — destructif / critique", dark: "#D92D35", light: "#B42318" },
  { token: "--success", label: "Succès", dark: "#3DD68C", light: "#1A7F4B" },
];

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1440px] px-4 py-10 md:px-10 md:py-14">
      <h2 className="font-display text-xl font-bold md:text-[28px]">{title}</h2>
      {intro ? <p className="mt-2 max-w-2xl text-muted">{intro}</p> : null}
      <div className="mt-6">{children}</div>
    </section>
  );
}

export default async function StyleGuidePage() {
  if (isProduction()) notFound();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  const featured = demoSeries[0]!;
  const price = { amount: demoPricing.episode, currency: demoPricing.currency };

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between gap-3 px-4 md:px-10">
          <Wordmark size="sm" />
          <div className="flex items-center gap-3">
            <span className="hidden text-[13px] text-muted sm:inline">Guide de style · version provisoire</span>
            <ThemeToggle initial={theme} />
          </div>
        </div>
      </header>

      <Hero series={featured} />

      <div className="mx-auto max-w-[1440px] px-4 md:px-10">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 text-[14px] text-muted">
          <strong className="text-text">Identité provisoire.</strong> Logo texte, titres et affiches sont des éléments de
          démonstration (D-14) : ils seront remplacés par le logo et les visuels officiels. Couleurs, typographie et
          composants sont soumis à votre validation.
        </div>
      </div>

      <Section id="series" title="Cartes de séries" intro="Affiches au format 2:3. Les séries à venir sont légèrement désaturées et portent le badge « Bientôt ».">
        <h3 className="mb-3 font-display text-base font-semibold">Disponible maintenant</h3>
        <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {demoSeries.filter((s) => s.status === "published").map((s) => (
            <PosterCard key={s.slug} series={s} />
          ))}
        </div>
        <h3 className="mb-3 mt-8 font-display text-base font-semibold">Bientôt disponible</h3>
        <div className="no-scrollbar -mx-4 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 lg:grid-cols-6">
          {demoSeries.filter((s) => s.status === "coming_soon").map((s) => (
            <PosterCard key={s.slug} series={s} />
          ))}
        </div>
      </Section>

      <Section id="episodes" title="Cartes d'épisodes" intro="Le badge d'accès est toujours visible : Gratuit, prix, Acheté ou Inclus dans votre pass.">
        <div className="grid max-w-3xl gap-1">
          {demoEpisodes.map((e) => (
            <EpisodeCard key={e.number} series={featured} episode={e} price={price} />
          ))}
        </div>
      </Section>

      <Section id="boutons" title="Boutons" intro="Jaune royal : une seule action principale par écran. Rouge : uniquement pour les actions critiques ou destructives.">
        <div className="flex flex-wrap items-center gap-3">
          <Button icon={<PlayIcon width={18} height={18} />}>Regarder</Button>
          <Button variant="secondary">Plus d&apos;infos</Button>
          <Button variant="ghost">Annuler</Button>
          <Button variant="danger">Dépublier l&apos;épisode</Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button size="lg">Payer avec Mobile Money</Button>
          <Button size="lg" loading>
            Vérification…
          </Button>
          <Button size="lg" disabled>
            Indisponible
          </Button>
        </div>
      </Section>

      <Section id="badges" title="Badges">
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind="free">Gratuit</Badge>
          <Badge kind="price">{formatPrice(499, "XOF")}</Badge>
          <Badge kind="owned">Acheté</Badge>
          <Badge kind="pass">Inclus dans votre pass</Badge>
          <Badge kind="soon">Bientôt</Badge>
          <Badge kind="ai">Créée avec l&apos;IA</Badge>
        </div>
      </Section>

      <Section id="achat-lecteur" title="Achat et lecteur" intro="Aperçus statiques de l'ambiance. Les écrans fonctionnels arrivent aux étapes suivantes ; les paiements restent simulés jusqu'à l'étape 7.">
        <div className="flex flex-col items-start gap-8 lg:flex-row">
          <PurchaseSheetPreview
            seriesTitle={featured.title}
            episodeTitle={demoEpisodes[4]!.title}
            episodeCount={8}
            price={{ currency: demoPricing.currency, episode: demoPricing.episode, pass: demoPricing.pass }}
            countryLabel={demoPricing.countryLabel}
          />
          <div className="w-full max-w-[720px] space-y-4">
            <PlayerPreview palette={featured.palette} title={featured.title} />
            <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4">
              <span className="text-danger">
                <AlertIcon />
              </span>
              <div>
                <p className="font-medium">Connexion trop faible.</p>
                <p className="text-[14px] text-muted">La lecture reprendra automatiquement. Vous pouvez passer en mode économie de données.</p>
                <div className="mt-3">
                  <Button size="md">Réessayer</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section id="navigation" title="Navigation mobile">
        <BottomNavPreview />
      </Section>

      <Section id="couleurs" title="Couleurs" intro="Toutes les couleurs sont des jetons. Contrastes vérifiés selon WCAG 2.1 AA (voir DESIGN_GUIDELINES §2).">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {swatches.map((s) => (
            <div key={s.token} className="flex items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-3">
              <span className="size-12 shrink-0 rounded-[10px] border border-border" style={{ background: `var(${s.token})` }} />
              <span className="min-w-0">
                <span className="block font-medium">{s.label}</span>
                <span className="block font-mono text-[12px] text-muted">
                  {s.token} · sombre {s.dark} · clair {s.light}
                </span>
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="typographie" title="Typographie" intro="Figtree pour l'expression (titres, prix), Roboto pour la lecture (textes, interface).">
        <div className="space-y-5">
          <p className="font-display text-[32px] font-extrabold uppercase leading-none md:text-[56px]">Titre de série</p>
          <p className="font-display text-xl font-bold md:text-[28px]">Titre de section — Figtree 700</p>
          <p className="font-display text-base font-semibold md:text-lg">Titre de carte — Figtree 600</p>
          <p className="max-w-2xl">
            Texte courant — Roboto 400. Le roi meurt sans désigner d&apos;héritier. Au palais, chacun choisit son camp
            avant l&apos;aube, et les alliances d&apos;hier deviennent les trahisons de demain.
          </p>
          <p className="text-[13px] font-medium text-muted">Métadonnées — Roboto 500 · Épisode 3 · 13 min 18</p>
          <p className="font-display text-lg font-bold tabular-nums">
            {formatPrice(499, "XOF")} · {formatPrice(1500, "XOF")}
          </p>
        </div>
      </Section>
    </div>
  );
}
