# Proposition — Choix de la qualité vidéo dans le lecteur (FR-36)

Statut : **option A validée par le fondateur et intégrée** (captures réelles : `docs/recette/qualite-integree/`). Les images de ce dossier étaient la proposition initiale.

## Option A (recommandée) — 4ᵉ bouton dans la colonne de droite
- Un bouton **« Auto »** (icône de réglage) entre « Épisodes » et « Plein écran », même forme que les boutons validés ; son libellé affiche le mode choisi (« Auto », « 360p », « 480p », « 720p »).
- Un toucher ouvre une **feuille en bas d'écran** (même style que la feuille « Épisodes ») :
  - **Automatique** — recommandé, s'adapte à la connexion (par défaut) ;
  - **Économie de données** — 360p, ≈ 10 Mo par épisode ;
  - **Équilibré** — 480p, ≈ 17 Mo par épisode ;
  - **Haute qualité** — 720p, ≈ 33 Mo par épisode.
- Le choix s'applique immédiatement, sans recommencer l'épisode, et reste mémorisé sur l'appareil pour tous les épisodes et séries.
- Avantages : à portée de pouce, cohérent avec les commandes validées, la consommation de données est affichée clairement.

## Option B — pastille « Auto ▾ » dans la barre du haut
- Plus discrète, mais petite cible tactile et en concurrence avec le titre sur les petits écrans ; elle ouvrirait la même feuille de choix.

## Comportement technique prévu
- « Automatique » : la qualité s'adapte au débit et à la taille de l'écran (comportement actuel).
- Mode fixé : le lecteur reste sur la qualité choisie ; en cas de connexion trop faible, un message propose de repasser en « Automatique » (jamais de changement silencieux).
