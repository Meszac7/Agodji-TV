# Décision — Séries sans saisons, Pass série, fin de série

Date : 2026-11-21 · Origine : règles fondamentales fixées par le fondateur · Statut : **validé par le fondateur** (règles) ; **nouvelle maquette du lecteur à valider**.

Rappel des règles confirmées sans changement : connexion Google + e-mail/mot de passe, **aucun SMS**, numéro facultatif non vérifié, liaison des méthodes sans perte d'achats (décision du 2026-11-20) ; lecteur vertical en défilement continu (principe de la maquette validé).

## 1. Structure du contenu : une série = une histoire complète, sans saisons

| Règle | Valeur | Nature |
|---|---|---|
| Nombre d'épisodes par série | **10 maximum** | Règle produit |
| Durée cible d'un épisode | **1 min 30** | Repère (pas une obligation) |
| Durée maximale d'un épisode | **1 min 50** | Limite individuelle |
| Durée totale maximale d'une série | **15 min** | Limite, calculée automatiquement |
| Ordre des épisodes | Ordre précis 1 → N, réorganisable par l'admin | Règle produit |

- La **durée totale** est **calculée automatiquement** à partir des durées des épisodes (jamais saisie à la main).
- L'administration **avertit** si un épisode dépasse 1 min 50, si la série dépasse 10 épisodes ou 15 minutes. **Comportement retenu par défaut : avertissement avec confirmation explicite et journalisée** (le fondateur a demandé un avertissement) ; passer à un blocage strict est un simple réglage **[D-28]**.
- Les limites sont des **réglages** (`app_settings`), pas des valeurs codées en dur.
- Une nouvelle histoire = **une nouvelle série** indépendante, avec ses épisodes et son propre pass.

**Conséquence notable** : avec des épisodes d'environ 1 min 30, le coût de diffusion par épisode est environ **7 fois plus faible** que l'hypothèse précédente (10 min) — TECHNICAL_ARCHITECTURE §6.1.

## 2. Modèle commercial : Pass série + épisode à l'unité

| Achat | Ce qu'il débloque | Expiration |
|---|---|---|
| **Pass série** | Tous les épisodes publiés de **cette série** + tous ses épisodes futurs dès leur publication | Jamais |
| **Épisode à l'unité** | Cet épisode uniquement | Jamais |

- Le pass ne couvre **jamais** une autre série.
- Avec un pass, **aucune demande de paiement** n'apparaît plus jamais pour cette série (diapositives de déblocage absentes, boutons d'achat masqués).
- Les droits sont **vérifiés par le serveur avant chaque lecture** (`has_episode_access`), même si l'interface affiche l'épisode comme débloqué.
- Prix : définis **par série et par grille tarifaire** (prix du pass, prix par défaut d'un épisode), avec exception possible par épisode. Valeurs indicatives XOF : **300 FCFA** l'épisode, **1 500 FCFA** le pass (D-03, modifiables par série).
- Le « pass saison » est supprimé partout.

## 3. Fin de série
Après le dernier épisode publié :
- proposition d'**autres séries** disponibles sur Agodjié TV (affiches, accès direct) ;
- bouton **retour au catalogue** ;
- si des épisodes sont encore annoncés (programmés), mention « Prochain épisode le … » ;
- **aucune** proposition de saison suivante.

## 4. Six responsabilités séparées (architecture)

| Couche | Rôle |
|---|---|
| Interface du lecteur | Affichage, gestes, commandes, diapositives |
| Moteur de diffusion | HLS adaptatif, préchargement de l'épisode suivant, renouvellement des liens signés, reprise sur erreur réseau |
| Droits d'accès | `has_episode_access` côté serveur avant chaque lecture |
| Progression | Position par épisode, « vu », reprise (y compris **reprise automatique après paiement**) |
| Ordre des épisodes (séquenceur) | Suite 1 → N d'une série, états des diapositives, fin de série |
| Achats et pass série | Commandes, paiement, droits (`entitlements` au niveau série ou épisode) |

## 5. Conséquences sur le travail déjà réalisé
- **Base de données** : migration `0007` — suppression de la table `seasons` ; les épisodes appartiennent directement à la série ; `season_prices` devient `series_prices` ; les droits et commandes passent de la saison à la série. Aucune donnée réelle n'existait (préproduction uniquement), la migration est donc sans risque.
- **Code** : séquenceur, maquette du lecteur, données de démonstration, guide de style (« Pass saison » → « Pass série ») et tests adaptés.
- **Documents** : toutes les mentions de saison remplacées ; règles RM-02, RM-09, RM-13 réécrites.
- **Rien n'est perdu** : le défilement vertical, la reprise, le déblocage dans le lecteur, les formats vertical/horizontal et la sécurité restent identiques.
