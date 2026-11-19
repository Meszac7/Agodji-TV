# Coûts de diffusion vidéo — estimation détaillée (Bunny Stream)

Statut : **estimation**, à confirmer sur le tableau de bord Bunny (calculateur et première facture) avant tout engagement. Aucun compte n'a été créé.
Niveau de preuve des tarifs : 🟡 documentation officielle Bunny lue **via moteur de recherche** (le site bunny.net n'est pas joignable depuis notre environnement de travail). Sources en fin de document.

## 1. Tarifs utilisés

| Poste | Tarif retenu | Remarque |
|---|---|---|
| Diffusion, réseau **Standard**, Afrique / Moyen-Orient | **0,06 $ / Go** | Réseau choisi pour commencer (décision du fondateur) |
| Diffusion, réseau Volume (pour comparaison) | 0,005 $ / Go (premier palier) | Qualité en Afrique non vérifiée |
| Stockage, 1 région | **0,01 $ / Go / mois** | +0,01 $ pour une 2ᵉ région, +0,005 $ au-delà (non prévu) |
| Encodage standard | **Gratuit** | Seul l'encodage « Premium » est facturé (non prévu) |
| Minimum de facturation | **1 $ / mois** pour tout le compte dès qu'une bibliothèque est active | Consommation inférieure arrondie à 1 $ |
| DRM « MediaCage Enterprise » | 99 $ / mois + licences | **Non retenu** (reporté) |
| Mode de paiement | Crédit prépayé (« Add funds »), sans expiration ; rechargement automatique possible | Solde négatif → services suspendus : prévoir le rechargement automatique |

Conversion indicative : **1 $ ≈ 600 FCFA** (ordre de grandeur pour la lecture des tableaux).

## 2. Hypothèses de consommation

**Débits par qualité** (réglages par défaut de Bunny en H.264 : 800 / 1 400 / 2 800 kbit/s pour 360p / 480p / 720p, + son ≈ 128 kbit/s) :

| Qualité | Données par minute | Épisode moyen (1 min 30) | Épisode maximal (1 min 50) |
|---|---|---|---|
| 360p | ≈ 7 Mo | ≈ 10 Mo | ≈ 13 Mo |
| 480p | ≈ 11,5 Mo | ≈ 17 Mo | ≈ 21 Mo |
| 720p | ≈ 22 Mo | ≈ 33 Mo | ≈ 40 Mo |

**Répartition supposée des qualités** (réseaux mobiles, lecture adaptative, écran de téléphone) : 40 % en 360p, 40 % en 480p, 20 % en 720p → **≈ 18 Mo par épisode vu en entier**. On ajoute **10 %** pour le préchargement du début de l'épisode suivant et les reprises → **≈ 20 Mo (0,02 Go) par épisode vu**.

**Coût par épisode vu** : 0,02 Go × 0,06 $ = **0,0012 $ ≈ 0,7 FCFA**.
Pour comparaison, un épisode vendu **499 FCFA** : la diffusion représente **≈ 0,15 %** du prix. Même si chaque achat est précédé de 5 visionnages gratuits, le coût reste **≈ 4 FCFA**, soit **< 1 %** du prix.

**Stockage par série** (toutes qualités, 15 min maximum, sans copie de l'original) : ≈ 40 Mo par minute → **≈ 0,6 Go par série**. En conservant le fichier original (recommandé : il permet de ré-encoder plus tard), compter ≈ 0,9 Go de plus pour un original 1080p → **≈ 1,5 Go par série**.

## 3. Scénarios mensuels (réseau Standard)

| Scénario | Hypothèse | Épisodes vus / mois | Données | Diffusion | Stockage (20 / 50 / 200 séries, original conservé) | **Total Bunny / mois** |
|---|---|---|---|---|---|---|
| Recette (étape L2) | 2–3 testeurs | ~500 | ≈ 10 Go | 0,60 $ | 3 séries ≈ 0,05 $ | **1 $** (minimum de facturation) |
| Pilote | ~300 testeurs × 10 épisodes | 3 000 | ≈ 60 Go | 3,60 $ | 20 séries ≈ 0,30 $ | **≈ 4 $ (≈ 2 400 FCFA)** |
| Lancement | 5 000 spectateurs actifs × 15 épisodes | 75 000 | ≈ 1,5 To | 90 $ | 50 séries ≈ 0,75 $ | **≈ 91 $ (≈ 55 000 FCFA)** |
| Croissance | 50 000 spectateurs × 20 épisodes | 1 000 000 | ≈ 20 To | 1 200 $ | 200 séries ≈ 3 $ | **≈ 1 200 $ (≈ 720 000 FCFA)** |

Même scénarios sur le réseau **Volume** (0,005 $/Go) : pilote ≈ 1 $ (minimum), lancement ≈ 8 $, croissance ≈ 103 $. **L'écart devient important à partir du lancement** : la comparaison de qualité Standard / Volume prévue pendant le pilote est donc utile.

**Mise en perspective des revenus (scénario lancement)** : si 10 % des 75 000 épisodes vus sont des épisodes achetés à l'unité (7 500 × 499 FCFA ≈ 3,7 millions FCFA), la diffusion (≈ 55 000 FCFA) représente ≈ 1,5 % du chiffre d'affaires de ces seuls achats, hors Pass.

## 4. Ce qui fait varier la facture
- **Part de 720p** : si tous les spectateurs regardent en 720p, le coût par épisode double presque (≈ 0,002 $). Le lecteur limite déjà la qualité à la taille de l'écran ; le mode « Économie de données » (exigence FR-36, à intégrer) l'abaisserait encore.
- **Épisodes gratuits** : ils coûtent autant que les payants à diffuser. Un très fort trafic gratuit sans conversion est le principal risque de coût.
- **Spectateurs hors d'Afrique** (diaspora en Europe, Amérique) : tarif de diffusion généralement plus bas que l'Afrique — notre estimation est donc prudente.
- **Durée réelle des épisodes** : 1 min 50 au lieu de 1 min 30 → +22 %.
- **Fichier MP4 de secours** : désactivé (il augmenterait le stockage et créerait des liens plus faciles à copier).

## 5. Coûts de la consommation de données pour vos spectateurs
Un épisode consomme ≈ 10 Mo en 360p, 17 Mo en 480p, 33 Mo en 720p. Une série complète (15 min) ≈ 100 à 330 Mo selon la qualité. C'est un argument pour proposer un mode « Économie de données » visible.

## 6. Ce qu'il faudra vérifier à l'ouverture du compte (étape L2)
1. Tarifs exacts affichés par le calculateur Bunny pour l'Afrique (Standard et Volume) et l'Europe.
2. Montant minimal du premier rechargement, frais éventuels de carte bancaire.
3. Débits réels produits pour nos vidéos (statistiques Bunny), à comparer à ces hypothèses.
4. Taille réelle stockée par épisode (toutes qualités + original).

## 7. Autres coûts mensuels de la plateforme (rappel, hors vidéo)
Supabase Pro ≈ 25 $ et Vercel Pro ≈ 20 $ au lancement (estimations de TECHNICAL_ARCHITECTURE §10, **à vérifier** sur leurs pages de tarifs) ; préproduction gratuite.

## Sources (documentation officielle Bunny, consultée via moteur de recherche)
- Tarifs Stream (diffusion, stockage, encodage) : https://bunny.net/docs/stream/pricing
- Débits par défaut par qualité : https://docs.bunny.net/stream/video-specification
- Encodage gratuit, stockage des qualités et de l'original : https://docs.bunny.net/stream/encoding
- Minimum de 1 $ par mois : https://bunny.net/faq/ et https://bunny.net/blog/billing-changes-for-new-accounts/
- Crédit prépayé : https://docs.bunny.net/billing/add-funds
- DRM MediaCage : https://docs.bunny.net/stream/drm
