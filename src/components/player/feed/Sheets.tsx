"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, LockIcon, PlayIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/money";
import { QUALITY_MODES, QUALITY_OPTIONS, type QualityMode } from "@/lib/player/quality";
import type { Slide } from "@/lib/player/sequencer";

function Sheet({ title, onClose, children, testId }: { title: string; onClose: () => void; children: React.ReactNode; testId: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" data-testid={testId}>
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/55" onClick={onClose} />
      <div className="relative max-h-[78%] w-full overflow-y-auto rounded-t-[var(--radius-sheet)] bg-surface-raised p-4 pb-[max(16px,env(safe-area-inset-bottom))] text-text" data-theme="dark">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="text-[14px] text-muted">Fermer</button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Panneau « Épisodes » (FR-34) : pour sauter directement à un épisode, jamais nécessaire pour enchaîner. */
export function EpisodesSheet({
  slides,
  activeIndex,
  progress,
  onPick,
  onClose,
  title,
}: {
  title: string;
  slides: Slide[];
  activeIndex: number;
  progress: Map<string, { positionSeconds: number; completed: boolean }>;
  onPick: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={title} onClose={onClose} testId="episodes-sheet">
      <ul className="grid gap-1">
        {slides.map((s, i) => {
          if (s.kind === "series-end") return null;
          const p = progress.get(s.episode.id);
          const state =
            s.kind === "scheduled" ? "Bientôt" : s.state === "locked" ? "Verrouillé" : p?.completed ? "Vu" : p && p.positionSeconds > 0 ? "En cours" : s.reason === "free" ? "Gratuit" : "Débloqué";
          return (
            <li key={s.episode.id}>
              <button
                type="button"
                onClick={() => onPick(i)}
                className={`flex w-full items-center gap-3 rounded-[var(--radius-control)] px-3 py-2.5 text-left ${i === activeIndex ? "bg-surface ring-1 ring-primary" : "hover:bg-surface"}`}
              >
                <span className="w-6 font-display font-bold tabular-nums text-muted">{s.episode.number}</span>
                <span className="min-w-0 flex-1 truncate">{s.episode.title}</span>
                <span className={`flex items-center gap-1 text-[12px] ${state === "Verrouillé" ? "text-muted" : state === "Vu" ? "text-success" : "text-muted"}`}>
                  {state === "Verrouillé" ? <LockIcon width={12} height={12} /> : state === "Vu" ? <CheckIcon width={12} height={12} /> : state === "En cours" ? <PlayIcon width={12} height={12} /> : null}
                  {state}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/**
 * Achat SIMULÉ depuis le lecteur (maquette) : connexion simulée, pays de paiement confirmé,
 * paiement simulé. Le vrai parcours (étapes 3 et 5) suivra la même structure.
 */
export function PurchaseSheet({
  label,
  description,
  amount,
  onDone,
  onClose,
}: {
  label: string;
  description: string;
  amount: number;
  onDone: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState<"summary" | "paying" | "done">("summary");
  // Reprise automatique après un paiement réussi (FR-39b) : la feuille se ferme et la lecture démarre.
  // onDone est conservé dans une référence : le parent se redessine souvent (progression de lecture)
  // et ne doit pas relancer la minuterie.
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });
  useEffect(() => {
    if (step !== "done") return;
    const t = window.setTimeout(() => onDoneRef.current(), 1600);
    return () => window.clearTimeout(t);
  }, [step]);
  return (
    <Sheet title={step === "done" ? "Paiement confirmé" : label} onClose={onClose} testId="purchase-sheet">
      {step === "done" ? (
        <div className="grid gap-4 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-surface text-success">
            <CheckIcon width={28} height={28} />
          </span>
          <p className="text-muted">La lecture reprend automatiquement…</p>
          <button type="button" onClick={onDone} className="rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary">
            Regarder maintenant
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-surface p-3">
            <span className="text-[14px] text-muted">{description}</span>
            <span className="font-display text-lg font-bold tabular-nums">{formatPrice(amount, "XOF")}</span>
          </div>
          <div className="rounded-[var(--radius-card)] bg-surface p-3 text-[14px]">
            <span className="text-muted">Compte : </span>
            <span className="font-medium">connecté avec Google (simulation)</span>
          </div>
          <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-surface p-3 text-[14px]">
            <span>
              <span className="text-muted">Payer depuis : </span>
              <span className="font-medium">Bénin</span>
            </span>
            <span className="text-primary-text">Changer</span>
          </div>
          <button
            type="button"
            disabled={step === "paying"}
            onClick={() => {
              setStep("paying");
              window.setTimeout(() => setStep("done"), 1200);
            }}
            className="mt-1 rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary disabled:opacity-60"
          >
            {step === "paying" ? "Vérification du paiement…" : "Payer avec Mobile Money (simulé)"}
          </button>
          <p className="text-center text-[12px] text-muted">Maquette : aucun paiement réel · Achat définitif · sans expiration</p>
        </div>
      )}
    </Sheet>
  );
}

/**
 * Lecteur réel, étape L1 : les comptes et les achats ne sont pas encore ouverts.
 * Aucun paiement n'est simulé ici (les simulateurs restent dans la maquette et les tests).
 */
export function PurchaseUnavailableSheet({ label, amount, onClose }: { label: string; amount: number; onClose: () => void }) {
  return (
    <Sheet title={label} onClose={onClose} testId="purchase-unavailable">
      <div className="grid gap-3">
        <div className="flex items-center justify-between rounded-[var(--radius-card)] bg-surface p-3">
          <span className="text-[14px] text-muted">Prix</span>
          <span className="font-display text-lg font-bold tabular-nums">{formatPrice(amount, "XOF")}</span>
        </div>
        <p className="text-[15px]">Les achats ouvriront très bientôt. En attendant, les épisodes gratuits restent disponibles.</p>
        <button type="button" onClick={onClose} className="rounded-[var(--radius-control)] bg-primary py-3 font-display font-bold text-on-primary">
          Compris
        </button>
      </div>
    </Sheet>
  );
}

/** Choix de la qualité vidéo (FR-36, option A validée) : « Automatique » par défaut, choix mémorisé sur l'appareil. */
export function QualitySheet({ mode, onPick, onClose }: { mode: QualityMode; onPick: (mode: QualityMode) => void; onClose: () => void }) {
  return (
    <Sheet title="Qualité vidéo" onClose={onClose} testId="quality-sheet">
      <div className="grid gap-2" role="radiogroup" aria-label="Qualité vidéo">
        {QUALITY_MODES.map((m) => {
          const on = m === mode;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onPick(m)}
              className={`flex items-center justify-between rounded-[var(--radius-card)] bg-surface p-3 text-left ${on ? "border-2 border-primary" : "border border-border"}`}
            >
              <span>
                <span className="block font-display font-bold">{QUALITY_OPTIONS[m].title}</span>
                <span className="block text-[13px] text-muted">{QUALITY_OPTIONS[m].detail}</span>
              </span>
              {on ? <CheckIcon width={18} height={18} className="text-primary-text" /> : null}
            </button>
          );
        })}
        <p className="text-center text-[12px] text-muted">Choix mémorisé sur cet appareil · « Automatique » par défaut</p>
      </div>
    </Sheet>
  );
}
