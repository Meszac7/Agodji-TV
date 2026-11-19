# Plan — Du lecteur maquette au véritable lecteur vidéo

Statut : **proposé, en attente de validation du fondateur**. Aucune intégration n'est commencée.
Référence visuelle et fonctionnelle : **maquette V2 validée** (`docs/recette/maquette-lecteur.md`, captures `docs/recette/maquette-lecteur-v2/`). Le design, les parcours et les interactions validés ne changent pas ; la maquette reste consultable en préproduction comme référence.

## 1. Ce qui existe déjà, ce qui manque

| Brique | État | Commentaire |
|---|---|---|
| Interface du lecteur (défilement, diapositives, feuilles d'achat) | ✅ maquette validée | Réutilisée telle quelle ; seule la source des données change |
| Séquenceur (ordre, verrouillé, bientôt, fin de série, enchaînement) | ✅ testé (17 tests) | Réutilisé côté navigateur ; recalculé côté serveur |
| Calcul de l'offre Pass / économie | ✅ testé (6 tests) | Affichage seulement ; le serveur recalcule le prix |
| Catalogue, prix, limites de format en base | ✅ migrations 0001–0008 | |
| Interface `VideoProvider` + simulateur | ✅ | Simulateur interdit en production |
| **Comptes clients** | ❌ | Étape 3 de la feuille de route |
| **Commandes, droits (`entitlements`), `has_episode_access`, progression serveur** | ❌ | Décrits dans DATABASE_SCHEMA, pas encore créés |
| **Moteur de diffusion réel (HLS)** | ❌ | La maquette lit des MP4 de démonstration |
| **Adaptateur Bunny Stream** | ❌ | Étape 6 |
| **Adaptateurs de paiement réels** | ❌ | Étape 7 |

**Conséquence honnête** : un lecteur qui vérifie *réellement* les droits et se débloque *réellement* après paiement a besoin des comptes, des commandes et d'un prestataire de paiement. Le plan ci-dessous construit donc le lecteur réel **en même temps** que ces briques, dans un ordre où chaque étape est démontrable.

## 2. Architecture technique du véritable lecteur

```
Téléphone / ordinateur                               Serveur (Vercel)                          Services externes
┌───────────────────────────────┐   GET /api/feed/:serie   ┌────────────────────────────┐
│ Interface (composants V2)     │ ───────────────────────► │ Séquenceur serveur          │──► Base (Supabase/Postgres)
│ Séquenceur (affichage)        │ ◄─ diapositives + états ─ │ (règles de visibilité,      │    has_episode_access,
│                               │   (sans identifiant vidéo)│  has_episode_access)        │    entitlements, prix
│ Moteur de diffusion           │  POST /api/playback/:ep  │ Droits → jeton court        │──► Bunny Stream (CDN signé)
│  hls.js / HLS natif iPhone    │ ───────────────────────► │ (après vérification)        │
│  préchargement, reprise,      │ ◄── lien signé 5 min ─── │                             │
│  erreurs réseau               │                          │                             │
│ Progression                   │  PUT /api/progress       │ Progression (connecté)      │
│ Achat (feuilles V2)           │  POST /api/orders        │ Commande à prix recalculé   │──► CinetPay / FedaPay
│                               │  GET /api/orders/:id     │ Statut de la commande       │
└───────────────────────────────┘                          │ Webhooks paiement + vidéo   │◄── notifications signées
                                                           └────────────────────────────┘
```

### 2.1 Les six couches (inchangées, TECHNICAL_ARCHITECTURE §6.4)
1. **Interface** : composants de la maquette V2 (aucun changement visuel), alimentés par le serveur au lieu des données de démonstration.
2. **Moteur de diffusion** (nouveau) :
   - HLS adaptatif : **hls.js** sur Android / Chrome / ordinateur, **HLS natif** sur iPhone (Safari) ;
   - au plus **3 lecteurs vidéo** en mémoire (précédent, courant, suivant) pour les téléphones modestes ;
   - **préchargement** du début de l'épisode suivant seulement s'il est accessible ;
   - qualité Auto / Économie de données / Haute qualité (FR-36) ;
   - **erreurs** : nouvelles tentatives automatiques avec délai croissant, lien expiré → nouveau lien demandé sans interrompre, accès refusé → diapositive de déblocage, hors ligne → message clair et reprise dès le retour du réseau (FR-43).
3. **Droits d'accès (serveur uniquement)** : `has_episode_access` en base ; le lien de lecture n'est émis **qu'après** cette vérification ; épisodes gratuits servis par le même chemin (pas d'intégration sauvage).
4. **Progression** : sur l'appareil pour un visiteur ; en base pour un client connecté (`playback_progress`), fusionnée à la connexion ; reprise exacte (FR-37).
5. **Séquenceur** : calculé au serveur à partir des mêmes règles que la base (brouillons absents, programmés annoncés, fin de série + suggestions d'autres séries) ; jamais d'enchaînement vers un épisode verrouillé.
6. **Achats et Pass série** : commande à prix **recalculé au serveur** ; droit accordé **uniquement** dans `confirm_order_payment`, après notification authentifiée **et** vérification auprès du prestataire ; le navigateur interroge ensuite le statut de la commande, recharge les états et la lecture reprend automatiquement (FR-39b).

### 2.2 Intégration de Bunny Stream — vérifiée sur la documentation officielle
Niveau de preuve : 🟡 documentation officielle consultée **via moteur de recherche** (les pages bunny.net ne sont pas joignables depuis notre environnement de travail) — **à confirmer par test réel** dès l'ouverture du compte.

| Besoin | Ce que Bunny propose | Source |
|---|---|---|
| Lecture avec **notre** lecteur (pas l'iframe Bunny) | Authentification par **jeton CDN** ; pour le HLS, jeton « dans le chemin » + `token_path` qui couvre la playlist **et tous les segments** du dossier de la vidéo ; expiration en horodatage | [Stream security options](https://docs.bunny.net/stream/security-options), [Advanced Token Authentication](https://docs.bunny.net/cdn/security/token-authentication/advanced) |
| Point à vérifier | La documentation avancée parle d'une clé HMAC, un ancien exemple utilise un SHA-256 simple : **test obligatoire** contre le vrai service avant de figer le code | [Support Bunny](https://support.bunny.net/hc/en-us/articles/360016055099-How-to-sign-URLs-for-BunnyCDN-Token-Authentication) |
| Encodage terminé (webhook) | Statuts numériques (3 = terminé, 4 = une résolution prête, 5 = échec) ; requête **signée** HMAC-SHA256 du corps ; identifiant d'événement stable pour ignorer les doublons | [Webhooks](https://docs.bunny.net/stream/webhooks) |
| Téléversement depuis l'admin sans exposer la clé | Téléversement **TUS** avec signature calculée par notre serveur (SHA-256) et date d'expiration | [TUS Resumable Uploads](https://docs.bunny.net/stream/tus-resumable-uploads) |
| Statistiques de lecture | API « play data » par vidéo | [Get Video play data](https://bunny.net/docs/api-reference/stream/manage-videos/get-video-play-data) |
| DRM (Widevine/FairPlay) | « MediaCage Enterprise » : 99 $/mois par bibliothèque + licences ; niveau de base gratuit | [MediaCage DRM](https://docs.bunny.net/stream/drm) |

**Réglages prévus dans chaque bibliothèque Bunny** : authentification par jeton CDN activée ; domaines autorisés = notre domaine uniquement ; repli MP4 désactivé si l'option existe ; résolutions **360p, 480p, 720p** (pas de 1080p au lancement : coût et data mobile) ; webhook vers `/api/webhooks/video`.

**Durée des épisodes automatique** : à la fin de l'encodage, la durée réelle renvoyée par Bunny est enregistrée sur l'épisode. Les **limites strictes** (1 min 50, 15 min, 10 épisodes) s'appliquent alors automatiquement — aucune saisie manuelle possible pour contourner.

**Jetons de lecture** : validité proposée **5 minutes** (un épisode dure au plus 1 min 50 : il se lit en entier avec un seul jeton ; le moteur renouvelle quand même avant expiration en cas de pause). Limites d'émission par client/IP (SEC-54), distinguant nouvelle lecture et renouvellement/préchargement.

### 2.3 Sécurité (non négociable)
- **Aucune URL vidéo permanente** : l'identifiant vidéo n'apparaît jamais dans le catalogue ; seule la réponse de `/api/playback` contient un lien signé, valable 5 minutes, restreint au domaine.
- **Simulateurs réservés aux tests** : vidéo simulée et paiement simulé **refusés au démarrage en production** (garde SEC-44 déjà en place pour le paiement, étendue à la vidéo avec un test dédié). En production, sans prestataire de paiement actif dans un pays, les épisodes payants y sont **non achetables** (statut `unavailable`) — jamais simulés. Les épisodes gratuits restent toujours lisibles.
- Clés Bunny, Supabase et paiement : **variables d'environnement serveur**, saisies par vous dans Vercel, jamais dans le code ni dans une variable `NEXT_PUBLIC_*`.
- Limite assumée : aucun système n'empêche l'enregistrement d'écran ; le jeton empêche le **partage de liens**. Le DRM reste reporté (à réévaluer si piratage constaté).

## 3. Services et comptes externes nécessaires

| Service | Pourquoi | Quand | Qui | Coût |
|---|---|---|---|---|
| **Bunny Stream** (bibliothèque de test, puis de production) | Hébergement, encodage, diffusion protégée | Étape L2 | Vous créez le compte ; je vous guide pour les réglages et l'endroit où saisir les clés | À la consommation (§4) |
| **Supabase** (projet de préproduction, puis de production) | Base de données, comptes clients | Étape L2–L3 | Vous créez le projet ; je fournis la configuration | Préproduction : offre gratuite ; production : ~25 $/mois |
| **Vercel** (préproduction, puis production) | Héberger le site, saisir les clés en sécurité | Étape L2 | Vous reliez le dépôt GitHub | Préproduction gratuite ; production ~20 $/mois (offre Pro — usage commercial, **à vérifier** dans les conditions Vercel) |
| **Google Cloud** (identifiant OAuth) | « Continuer avec Google » | Étape L3 | Vous, guidé pas à pas | Gratuit |
| **CinetPay / FedaPay** (sandbox, puis live) | Paiement réel | Étape L6 | Vous (contrats, KYC) | Commissions par transaction (à confirmer par écrit) |
| Sentry | Remontée d'erreurs du lecteur | L1 | Optionnel au début | Gratuit au départ |
| Service d'e-mails (D-24) | Confirmation de compte en production | Avant le pilote | Vous | Offre gratuite probable, **à vérifier** |

## 4. Coûts à prévoir (ordre de grandeur, à confirmer sur facture)

Tarifs publics Bunny Stream relevés dans la documentation officielle (🟡, [Pricing](https://bunny.net/docs/stream/pricing)) :
- **Stockage** : ~0,01 $/Go par région.
- **Diffusion, réseau Standard, Afrique / Moyen-Orient** : ~0,06 $/Go. **Réseau Volume** (tarif mondial unique) : à partir de ~0,005 $/Go — qualité de service en Afrique **à tester** avant d'en dépendre.
- Encodage, minimum mensuel : **non confirmés** à ce jour → à vérifier à l'ouverture du compte.

| Scénario mensuel | Diffusion (Standard Afrique) | Diffusion (Volume) |
|---|---|---|
| Recette / pilote : ~500 épisodes vus (~20 Mo chacun ≈ 10 Go) | ≈ 0,60 $ | ≈ 0,05 $ |
| Lancement : ~10 000 épisodes vus (≈ 200 Go) | ≈ 12 $ | ≈ 1 $ |
| Croissance : ~100 000 épisodes vus (≈ 2 To) | ≈ 120 $ | ≈ 10 $ |

Stockage : 100 épisodes × 3 qualités ≈ quelques Go → moins de 0,10 $/mois. **Repère** : un épisode vendu 499 FCFA (≈ 0,76 €) coûte ≈ 0,001 $ à diffuser en Standard. Les épisodes **gratuits** coûtent aussi : à surveiller.
DRM Enterprise (non retenu) : 99 $/mois minimum + licences.

## 5. Plan de développement détaillé (par étapes, chacune validée par vous)

Chaque étape : livrables, tests automatisés, fiche de recette en français, captures/vidéo, CI verte, **arrêt pour validation**.

### L1 — Moteur de lecture réel et flux depuis la base (aucun compte externe)
- Pages réelles « fiche série » et « lecteur » lues depuis la base, avec les composants V2 (design inchangé).
- `GET /api/feed/:serie` (états calculés au serveur, sans identifiant vidéo) et `POST /api/playback/:episode` pour les **épisodes gratuits**.
- Moteur HLS (hls.js + natif iPhone), préchargement, 3 lecteurs max, qualité, gestion complète des erreurs, reprise sur l'appareil.
- Vidéos HLS de démonstration servies par le **simulateur** (local et préproduction uniquement).
- Tests : enchaînement, arrêt devant un épisode payant, reprise, coupure réseau simulée, lien expiré renouvelé, accès refusé, aucun identifiant vidéo dans les réponses, simulateur refusé en production.

### L2 — Bunny Stream (bibliothèque de test)
- Adaptateur `bunny` derrière `VideoProvider` ; liens signés 5 min ; webhook signé d'encodage ; durée réelle enregistrée automatiquement.
- Mise en ligne de la préproduction (Vercel + Supabase de préproduction).
- Tests : contrat commun simulateur/Bunny ; **tests réels** : lien copié refusé après expiration et depuis un autre domaine ; épisode lu jusqu'au bout ; Android et iPhone réels.
- Vous : regarder un vrai épisode sur votre téléphone et essayer de partager le lien.

### L3 — Comptes clients (étape 3 de la feuille de route)
- Google + e-mail/mot de passe, confirmation d'e-mail, « Mon compte », connexion par-dessus le lecteur sans perdre l'épisode, progression synchronisée.
- Tests SEC-01 à SEC-16 (dont prise de contrôle anticipée dans les deux sens).

### L4 — Droits, commandes et achat depuis le lecteur (paiement simulé en préproduction)
- Tables et fonctions : `orders`, `entitlements`, `has_episode_access`, `confirm_order_payment`, `playback_progress`.
- Achat épisode (499 FCFA) / Pass (prix de la série) depuis la diapositive et la fiche (feuilles V2) ; prix recalculé au serveur ; confirmation du pays de paiement ; déblocage **uniquement** après confirmation ; reprise automatique ; bibliothèque.
- Tests obligatoires : idempotence (notification ×5 → un seul droit), falsification, montant différent → « à traiter », retour navigateur « succès » sans paiement → aucun droit, Pass = plus jamais de demande de paiement pour la série, matrice d'accès complète.

### L5 — Administration des épisodes et des vidéos (partie de l'étape 4)
- Connexion admin avec TOTP ; séries, épisodes, ordre ; **téléversement direct vers Bunny** ; état d'encodage ; durées et limites affichées ; prix par épisode et Pass par série, par grille ; publication / programmation.
- Vous : mettre en ligne seul une série complète.

### L6 — Paiement réel en sandbox (étape 7)
- Adaptateurs FedaPay et CinetPay, même suite de tests de contrat que le simulateur.
- **499 FCFA et CinetPay** : CinetPay **ne sera pas activé** tant que la contrainte « multiple de 5 » n'est pas tranchée par écrit (réponse de CinetPay) ou par votre décision explicite. Aucun prix modifié en silence ; le système refuse de proposer un moyen de paiement incompatible avec le prix.

### L7 — Durcissement et recette
- Revue de sécurité indépendante (vidéo, paiements, comptes) ; tests sur téléphones réels Android d'entrée de gamme et iPhone, réseau lent ; mesures de qualité (temps de démarrage, interruptions).

Ensuite : pilote multi-pays (étape 10), avec contrats de paiement réels.

## 6. Décisions et actions qui nécessitent votre intervention

| # | Sujet | Ma recommandation | Bloque |
|---|---|---|---|
| 1 | Valider ce plan et l'ordre L1 → L7 | Valider | Tout |
| 2 | Créer le compte **Bunny Stream** | Maintenant, pour l'étape L2 (je vous guide) | L2 |
| 3 | Créer **Supabase** (préproduction) et relier **Vercel** | Avant L2 | L2–L3 |
| 4 | Projet **Google Cloud** (OAuth) | Avant L3 | L3 |
| 5 | Qualités vidéo : 360p / 480p / 720p, sans 1080p | Valider | L2 |
| 6 | Réseau de diffusion Bunny : Standard (~0,06 $/Go Afrique) ou Volume (~0,005 $/Go) | Commencer en Standard, comparer pendant le pilote | Pilote |
| 7 | DRM : rester reporté | Valider le report | — |
| 8 | Fournir 2 ou 3 **vrais épisodes** 9:16 (≤ 1 min 50) pour les tests | Dès L2 | L2 |
| 9 | **499 FCFA / CinetPay** : envoyer les questions écrites (Q-III.12) ; décider ensuite (garder 499 avec FedaPay, ou 495/500 chez CinetPay) | Envoyer les questions maintenant | Activation de CinetPay (L6) |
| 10 | Durée des liens de lecture : 5 minutes | Valider | L2 |
