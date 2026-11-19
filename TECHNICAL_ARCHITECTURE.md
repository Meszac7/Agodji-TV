# Agodjié TV — Architecture technique

> Statut : Phase 1 — recommandations à valider. Aucun service n'est encore configuré.
> Les prix et capacités des prestataires cités proviennent de sources publiques consultées le 2026-11-19 ; ils sont **indicatifs** et doivent être confirmés directement auprès de chaque prestataire (voir LAUNCH_CHECKLIST).

---

## 1. Résumé de la pile recommandée

| Besoin | Choix recommandé | Alternative écartée (pour la V1) |
|---|---|---|
| Frontend + backend | **Next.js (App Router) + TypeScript**, un seul projet | SPA + API séparée (NestJS/Express) |
| Hébergement de l'application | **Vercel** (plan Pro, usage commercial) | VPS auto-administré, Netlify |
| Base de données | **Supabase Postgres** | Firebase (NoSQL, mauvais pour les transactions), MongoDB |
| Authentification clients | **Sessions serveur maison** (numéro + PIN + OTP SMS gérés par notre serveur) — voir §7 | Supabase Auth avec couche PIN (contournable, voir §7) ; Clerk/Auth0 (pas de PIN, coût) |
| Authentification admins | **Supabase Auth** e-mail + mot de passe + TOTP obligatoire | — |
| Paiement | **CinetPay + FedaPay** derrière une interface commune, routage par pays et moyen de paiement configurable (§5) | Un seul prestataire (couverture insuffisante pour une plateforme panafricaine) |
| Vidéo | **Bunny Stream** (encodage, HLS adaptatif, CDN, jetons signés) | Mux (plus cher), Cloudflare Stream, AWS (complexe) |
| Images (affiches, vignettes) | **Supabase Storage** (bucket public en lecture) + optimisation d'images Next.js | Bunny Storage (à reconsidérer si coûts d'images élevés) |
| Anti-robot | **Cloudflare Turnstile** | reCAPTCHA (plus intrusif) |
| Envoi SMS (OTP) | Prestataire SMS appelé **directement par notre serveur** (international type Twilio/Vonage ou agrégateur local) **[D-16]** | Fournisseur « phone » de Supabase Auth (contournerait nos limites anti-fraude) |
| Suivi des erreurs | **Sentry** (offre gratuite au départ) | — |
| Statistiques métier | **Requêtes SQL sur nos propres données** affichées dans l'admin | Outil BI externe |
| Mesure d'audience | **Vercel Web Analytics** ou **Plausible** (léger, sans cookie) — P1 | Google Analytics (lourd, consentement) |
| Tests | **Vitest** (logique), **Playwright** (parcours navigateur, mobile), tests SQL des règles d'accès | — |
| CI | **GitHub Actions** (lint, typage, tests à chaque push) | — |

### Pourquoi ces choix

- **Un seul projet Next.js** : pages publiques rendues côté serveur (rapides sur mobile, bien référencées), routes serveur pour les webhooks de paiement et la signature des vidéos, admin dans le même code. Une seule chose à déployer, à tester et à comprendre. C'est le facteur n°1 de maintenabilité pour une petite équipe.
- **Postgres (via Supabase)** : les achats, paiements et droits d'accès exigent des **transactions** et des **contraintes d'unicité** fiables — c'est exactement ce que fait une base relationnelle. Supabase fournit Postgres managé, sauvegardes, Auth (pour les admins), stockage et règles d'accès par ligne (RLS) sans serveur à administrer.
- **Bunny Stream** : couvre l'encodage, le streaming adaptatif HLS, les vignettes, un lecteur intégrable et l'authentification par jeton, à un coût bas. Voir §6.
- **Vercel** : déploiement automatique depuis GitHub, environnements de prévisualisation par branche, aucune administration serveur. Attention : le plan gratuit (Hobby) **interdit l'usage commercial** **[à vérifier dans les CGU Vercel]** → plan Pro requis en production.

### Ce qui est délibérément évité
- Microservices, files de messages, Kubernetes, serveurs à administrer.
- Accès direct du navigateur à la base : **le navigateur ne parle jamais à la base de données**. Toutes les lectures et écritures passent par notre serveur Next.js. Cela supprime toute une classe de failles (RLS mal écrite, colonnes sensibles exposées, fonctions SQL appelables depuis Internet).
- Dépendre d'un SDK de paiement non officiel.

## 2. Vue d'ensemble

```
                    ┌───────────────────────────────────────────┐
  Navigateur        │            Vercel — Next.js               │
  (mobile)  ───────►│  Pages publiques (SSR)  │  /admin          │
                    │  Routes serveur :                          │
                    │   • /api/auth/*   (OTP, PIN, sessions)     │
                    │   • /api/checkout (création commande)      │
                    │   • /api/webhooks/<prestataire>/<compte>   │
                    │   • /api/playback/:episode (jeton vidéo)   │
                    │   • /api/webhooks/bunny (état encodage)    │
                    │   • /api/cron/reconcile (paiements)        │
                    └──────┬───────────────┬──────────────┬──────┘
                           │ clé service    │ clés API     │ clé de signature
                           ▼ (serveur seul) ▼              ▼ (serveur seul)
                 ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
                 │ Supabase         │ │ CinetPay     │ │ Bunny Stream     │
                 │ Postgres + RLS   │ │ FedaPay      │ │ encodage, HLS,   │
                 │ Auth (admins)    │ │ (+ futurs)   │ │ CDN, jetons      │
                 │ Storage (images) │ └──────┬───────┘ └────────┬─────────┘
                 └──────────────────┘        │ webhook          │ flux vidéo signé
                                             └──► /api/webhooks │
                                                                ▼
                                                          Navigateur
```

Le serveur appelle aussi le **prestataire SMS** (OTP), non représenté.

Principe : **le navigateur ne détient jamais de secret et ne parle jamais à la base**. Il ne reçoit que des données publiques, un cookie de session opaque, et des jetons vidéo de courte durée.

## 3. Frontend

- Next.js App Router, composants serveur par défaut, composants client seulement là où il y a interaction (lecteur, formulaires, thème).
- Style : **Tailwind CSS** avec des jetons de design (variables CSS) définis dans DESIGN_GUIDELINES ; composants accessibles (bibliothèque de primitives type Radix/shadcn, adaptée au style de la marque — pas l'apparence par défaut).
- Polices **Figtree** et **Roboto** auto-hébergées via `next/font` (pas d'appel à Google au chargement, meilleure performance).
- Thème sombre par défaut, thème clair disponible, préférence mémorisée (cookie, pour éviter le flash au chargement).
- Validation des formulaires : schémas **Zod** partagés client/serveur (le serveur revalide toujours).

## 4. Backend et données

- Logique serveur dans les routes et *server actions* Next.js, regroupée dans des modules métier testables : `catalog`, `auth`, `orders`, `payments`, `entitlements`, `playback`, `admin`, `analytics`.
- Accès base : **uniquement depuis le serveur**, avec la clé de service, y compris pour le catalogue public (pages rendues côté serveur et mises en cache). Les opérations où l'atomicité compte (ex. « marquer payé + accorder le droit ») sont des **fonctions Postgres transactionnelles**.
- **RLS activé sur toutes les tables sans aucune politique** pour les rôles `anon` et `authenticated` : même si la clé publique Supabase est utilisée (connexion admin), elle ne donne accès à aucune donnée. Droit d'exécution des fonctions SQL retiré à `PUBLIC`, `anon` et `authenticated`.
- Région : choisir la même région pour Supabase et les fonctions Vercel, la plus proche de l'Afrique de l'Ouest/centrale disponible (probablement **Europe de l'Ouest, ex. Paris ou Francfort**) **[à vérifier : liste des régions Supabase/Vercel]**.
- Publication programmée : pas de tâche planifiée nécessaire ; un contenu est visible si `status = 'published'` **ou** `status = 'scheduled' AND publish_at <= now()`.
- Tâches planifiées (Vercel Cron) : réconciliation des paiements (§5.3), expiration des commandes, purge des tentatives de connexion, des OTP et des sessions expirés.
- Encodage vidéo : Bunny notifie `/api/webhooks/bunny` ; la notification sert seulement de **signal** — le serveur relit l'état de la vidéo via l'API Bunny avant de mettre à jour `video_status`. Bouton « actualiser l'état » dans l'admin en secours.

## 5. Paiements — architecture multi-prestataires et multi-marchés

> Orientation validée par le fondateur (2026-11-19) : **plateforme panafricaine dès le départ**, **CinetPay et FedaPay intégrés tous les deux**, sélection automatique des moyens de paiement selon le pays. Voir PROJECT_BRIEF §8 (D-01, D-02).
> Les documentations officielles des prestataires n'ont pas pu être consultées directement depuis l'environnement de travail (accès réseau bloqué) ; les informations ci-dessous proviennent des résultats de recherche sur ces documentations et de sources tierces. **Chaque ligne doit être confirmée par écrit par le prestataire avant l'ouverture d'un marché** (LAUNCH_CHECKLIST §3).

### 5.1 Couverture observée par pays et moyen de paiement

Légende : ✅ indiqué par une source du prestataire · ⚠️ indiqué par une source tierce, ancienne ou contradictoire · ❌ non couvert selon les sources trouvées · ? aucune information.

| Pays | Devise | CinetPay — Mobile Money | FedaPay — Mobile Money | Carte |
|---|---|---|---|---|
| Bénin | XOF | ✅ pays listé ; opérateurs à confirmer | ✅ MTN, Moov, Celtiis, Coris Money, BMO | CinetPay ✅ / FedaPay ✅ (Visa/Mastercard) |
| Côte d'Ivoire | XOF | ✅ Orange, MTN, Moov, Wave | ✅ MTN, Moov, Orange, Wave | ✅ / ✅ |
| Sénégal | XOF | ✅ pays listé ; Orange, Wave, Free… ⚠️ | ✅ Orange Money, Wave, Mixx by Yas | ✅ / ✅ |
| Togo | XOF | ✅ Moov, T-Money (Togocel ⚠️) | ✅ Moov, T-Money / Mixx by Yas | ✅ / ✅ |
| Burkina Faso | XOF | ✅ Orange, Moov, Wave | ⚠️ figure dans une grille tarifaire, absent de la page d'accueil | ? |
| Mali | XOF | ✅ Orange, Moov | ⚠️ Orange Money dans la doc v1 | ? |
| Niger | XOF | ⚠️ Airtel cité sur une page | ✅ Airtel Money | ? |
| Cameroun | XAF | ✅ Orange, MTN | ❌ | CinetPay ✅ |
| RD Congo | CDF / USD | ✅ Orange, Airtel, M-Pesa, Africell | ❌ | ? |
| Guinée | GNF | ✅ Orange, MTN | ⚠️ « MTN » cité dans la doc v1 (douteux, FedaPay se présente comme UEMOA) | ? |
| Gabon, Congo-Brazzaville, Tchad, Centrafrique | XAF | ❌ aucune source | ❌ | — |

**Constats :**
1. **FedaPay est un acteur de la zone UEMOA (XOF)** : utile pour Bénin, Côte d'Ivoire, Sénégal, Togo, Niger (et peut-être Mali, Burkina). Il ne couvre ni le Cameroun ni la RDC.
2. **CinetPay est le seul des deux à couvrir l'Afrique centrale** (Cameroun, RDC) et la Guinée.
3. **Le reste de l'Afrique centrale (Gabon, Congo, Tchad, RCA) n'est couvert par aucun des deux** d'après les sources trouvées. Un troisième prestataire serait nécessaire ; l'architecture le permet (§5.3).
4. Dans la zone UEMOA, les deux prestataires se recouvrent : cela permet une **redondance** (bascule si l'un est en panne) et un choix par les **frais**.

### 5.2 Contraintes des prestataires qui structurent l'architecture

| Contrainte | Source | Conséquence |
|---|---|---|
| CinetPay : **un compte marchand est lié à une devise / un pays** (« si votre compte est créé au Cameroun, vous ne pouvez initier un paiement qu'en XAF ») | Doc CinetPay (message d'erreur documenté) | Il faudra **un compte CinetPay par zone monétaire** (XOF, XAF, CDF/USD, GNF). L'architecture gère donc des **comptes de paiement**, pas seulement des prestataires. |
| CinetPay : le marchand doit être **une entreprise établie dans le pays** où il encaisse | FAQ CinetPay | **Contrainte juridique majeure** : voir §5.7 |
| CinetPay : `channels` = `ALL`, `MOBILE_MONEY`, `CREDIT_CARD`, `WALLET` ; la liste des pays affichée sur le guichet dépend de la devise | Doc CinetPay | On peut **présélectionner la famille de moyen de paiement** (Mobile Money ou carte), pas l'opérateur ; l'opérateur est choisi sur la page CinetPay. |
| CinetPay : montant **multiple de 5** (sauf USD) | Doc CinetPay | Validation des prix par compte de paiement (pas d'arrondi). |
| FedaPay : présélection de l'opérateur via l'API **uniquement pour MTN** (doc v1) | Doc FedaPay v1 | L'utilisateur choisit son opérateur sur la page FedaPay. |
| FedaPay : entité béninoise immatriculée au RCCM pour opérer au Bénin ; entité étrangère acceptée **à la discrétion** de FedaPay (pays d'enregistrement, compte bancaire d'entreprise) | CGU FedaPay | Éligibilité à confirmer avec le service conformité. |
| Reversements : CinetPay exige un compte bancaire dans le pays pour les zones hors UEMOA | CGU CinetPay | Plusieurs comptes bancaires possibles selon les zones. |

### 5.3 Architecture : prestataires interchangeables

Trois niveaux, tous **configurables en base depuis l'admin**, sans modification du code :

```
Prestataire (code)          Compte de paiement (contrat)        Route (pays × moyen)
┌──────────────┐            ┌───────────────────────────┐        ┌──────────────────────────────┐
│ cinetpay     │──1───*────►│ cinetpay-xof  (XOF, live) │◄──*────│ BJ · mobile_money · prio 2   │
│ fedapay      │            │ cinetpay-xaf  (XAF, live) │        │ BJ · mobile_money · prio 1 ──┼─► fedapay-xof
│ (futur : …)  │            │ fedapay-xof   (XOF, live) │        │ CM · mobile_money · prio 1   │
└──────────────┘            └───────────────────────────┘        │ CD · mobile_money · prio 1   │
  code = adaptateur           identifiants = variables            └──────────────────────────────┘
  (un module par               d'environnement (jamais en base)     priorité 1 = principal,
   prestataire)                                                     2 = secours
```

- **Adaptateur par prestataire** : un module par prestataire implémente l'interface commune `PaymentProvider` :
  - `createCheckout(order, account, method)` → URL de paiement
  - `authenticateNotification(request, account)` → notification authentique ou rejet
  - `fetchTransactionStatus(reference, account)` → statut, montant, devise réels (fait foi)
  - `capabilities(account)` → devises, moyens, contraintes de montant (ex. multiple de 5)
  - Ajouter un prestataire = écrire un nouvel adaptateur + ses tests ; **rien d'autre ne change** (commandes, droits, admin, statistiques sont indépendants du prestataire).
- **Comptes de paiement** (`payment_accounts`) : un contrat marchand = une devise, un environnement (sandbox/live), une référence vers ses identifiants (préfixe de variables d'environnement). Activable/désactivable.
- **Routes** (`payment_routes`) : pour chaque pays et chaque moyen (`mobile_money`, `card`, `wallet`), un compte principal et éventuellement un compte de secours, avec la liste des opérateurs à afficher (information visuelle).

**Désactiver un prestataire ou un compte** (panne, litige, frais) :
- les nouveaux paiements basculent automatiquement sur la route de secours, ou le moyen disparaît du pays s'il n'y en a pas ;
- **les commandes déjà en cours continuent d'être vérifiées** (webhooks et réconciliation restent actifs pour un compte désactivé tant qu'il a des commandes non finalisées) ;
- action journalisée dans `audit_logs`.

### 5.4 Sélection automatique du moyen de paiement

1. **Pays de paiement** : par défaut, le pays du numéro de téléphone vérifié du client. L'utilisateur peut choisir un autre pays **parmi les marchés ouverts** (ex. Béninois résidant à Abidjan avec un compte Mobile Money ivoirien). Avant connexion, le pays sert seulement à **afficher** les prix : il est estimé grâce à la géolocalisation de l'adresse IP fournie par l'hébergeur, jamais utilisée pour facturer.
2. **Prix** : le serveur lit la grille tarifaire du marché choisi (§5.5) et fige le montant dans la commande.
3. **Moyens proposés** : uniquement ceux ayant une route active pour ce pays, avec les logos des opérateurs (ex. « Mobile Money — MTN, Moov, Celtiis » ; « Carte bancaire — Visa, Mastercard »).
4. **Routage** : le serveur choisit la route active de plus haute priorité pour (pays, moyen) et crée le paiement sur le compte correspondant, en présélectionnant la famille de moyen quand le prestataire le permet.
5. Le navigateur n'envoie que `(produit, pays, moyen)` ; **le serveur valide** que le pays est ouvert, que la route existe, et recalcule tout.

### 5.5 Devises et tarifs par marché

- **Grilles tarifaires** (`price_lists`) : une grille = une devise + un pas d'arrondi. Chaque marché pointe vers une grille. Exemple initial **[D-03]** :
  - `XOF` : Bénin, Côte d'Ivoire, Sénégal, Togo, Burkina, Mali, Niger → 300 / 1 500 ;
  - `XAF` : Cameroun → 300 / 1 500 ;
  - `RDC` : USD ou CDF, montant à décider ;
  - `GNF` : Guinée, montant à décider.
- Plusieurs marchés partagent une grille (simple) ; un marché peut avoir sa propre grille si un prix local différent est souhaité (flexible), sans changer le code.
- Les prix sont saisis par saison et par grille (prix épisode, prix pass), avec exceptions possibles par épisode (DATABASE_SCHEMA §3.3).
- Les montants sont validés contre les contraintes de **tous les comptes de paiement** routés pour les marchés de la grille (ex. multiple de 5).
- Pas de conversion automatique de devises : chaque prix est saisi explicitement (évite les montants bizarres et les risques de change).
- Statistiques toujours **par devise**, jamais additionnées entre devises.

### 5.6 Flux de paiement sécurisé

```
1. Client choisit « Acheter », le pays de paiement et le moyen       (navigateur)
2. POST /api/checkout {produit, pays, moyen}                          (serveur)
   - session valide, client actif, contenu achetable, non possédé (FR-21)
   - marché ouvert ? route active pour (pays, moyen) ?
   - prix lu dans la grille du marché → commande `pending` avec
     référence unique, montant, devise, pays, moyen, compte de paiement figés
   - réutilise une commande `pending` récente identique (anti double-clic)
3. Adaptateur du prestataire → URL de paiement
4. Redirection du client → page du prestataire → validation (Mobile Money/carte)
5. Prestataire → POST /api/webhooks/<prestataire>/<compte>             (serveur)
   a. authentifier la notification avec le secret DE CE COMPTE
      (signature / HMAC, comparaison à temps constant) → sinon 401, journalisé
   b. journaliser l'événement brut (payment_events)
   c. INTERROGER L'API du prestataire (identifiants de ce compte) : statut réel
   d. vérifier : référence connue, compte = compte de la commande,
      montant = montant figé, devise identique
   e. si payé : confirm_order_payment (transaction SQL unique, idempotente) :
      commande → `paid` + droit d'accès (ON CONFLICT DO NOTHING)
   f. répondre 200 seulement APRÈS ces étapes ; 500 en cas d'erreur temporaire
      (API injoignable, base indisponible) pour que le prestataire réessaie.
   L'idempotence repose sur l'état de la commande et l'unicité des droits,
   pas sur le rejet des notifications déjà reçues.
6. Retour navigateur sur /paiement/retour?order=… → interroge le serveur
   → affiche le statut réel (jamais déduit des paramètres d'URL)
7. Cron de réconciliation (tous comptes, y compris désactivés) :
   - `pending` : revérifiées toutes les ~10 min ;
   - `pending` sans paiement après 60 min → `expired` ;
   - `expired`, `failed`, `cancelled` de moins de 72 h : revérifiées toutes les heures.
```

Règles détaillées : SECURITY_REQUIREMENTS §5.

### 5.7 Restrictions liées au pays d'enregistrement de la société

C'est **la contrainte la plus importante** de l'orientation panafricaine, et elle n'est pas technique.

| Zone | Prestataire possible | Exigence observée | Risque |
|---|---|---|---|
| UEMOA (XOF) | FedaPay | Entité béninoise (RCCM) pour opérer au Bénin ; entité étrangère à la discrétion de FedaPay | Faible si la société est béninoise **[D-09]** |
| UEMOA (XOF) | CinetPay | « Entreprise établie dans le pays » où l'on encaisse ; Bénin listé parmi les pays | À confirmer : un compte XOF ouvert depuis le Bénin couvre-t-il les autres pays UEMOA ? |
| CEMAC (XAF, Cameroun) | CinetPay | Compte lié au pays/devise ; entreprise établie dans le pays ? compte bancaire local pour les reversements | **Élevé** : une société camerounaise ou un partenaire local pourrait être exigé |
| RDC (CDF/USD) | CinetPay | Idem ; compte bancaire en RDC probable | **Élevé** |
| Guinée (GNF) | CinetPay | Idem | **Élevé** |

Autres sujets juridiques liés au pays d'enregistrement (à traiter avec un juriste/comptable, LAUNCH_CHECKLIST §4) :
- **TVA sur les services numériques** : plusieurs pays de la cible taxent les services numériques vendus à leurs résidents, même par une entreprise étrangère.
- **Réglementation des changes** (BCEAO pour l'UEMOA, BEAC pour la CEMAC, Banque centrale du Congo) : rapatriement des fonds encaissés hors de la zone de la société.
- **Protection des données** : déclarations éventuelles dans chaque pays ouvert.

**Approche recommandée (sans limiter artificiellement le lancement)** : l'architecture est panafricaine dès le premier jour ; **chaque marché s'ouvre dès que sa route de paiement est contractuellement et techniquement validée** (« porte qualité » par marché, LAUNCH_CHECKLIST §9). Les marchés dont le contrat n'est pas prêt restent visibles en navigation (catalogue, épisodes gratuits) mais l'achat y affiche « Paiement bientôt disponible dans votre pays ».

### 5.8 Échecs et remboursements
- Paiement échoué/annulé : commande `failed`/`cancelled`, aucun droit. L'utilisateur peut recommencer (nouvelle commande, éventuellement avec un autre moyen).
- **Le prestataire a toujours le dernier mot** : une commande `expired`, `failed` ou `cancelled` passe à `paid` si l'API du prestataire confirme ensuite le paiement.
- Montant, devise ou compte différents de la commande : `needs_review`, pas de droit automatique, **alerte admin**.
- Paiement d'un contenu déjà couvert : commande `paid` marquée `is_duplicate_payment`, **alerte admin** pour remboursement.
- Remboursement : manuel via le tableau de bord du prestataire concerné **[à vérifier : API de remboursement Mobile Money]** ; l'admin marque ensuite la commande `refunded`, ce qui révoque **uniquement le droit créé par cette commande**.

## 6. Vidéo

### 6.1 Évaluation de Bunny Stream — **adapté à la V1**

| Besoin | Bunny Stream |
|---|---|
| Téléversement et gestion | Oui (interface + API, téléversement direct possible) |
| Streaming adaptatif | Oui (HLS, plusieurs résolutions) |
| Mobile | Oui (HLS natif iOS, lecteur web compatible Android) |
| Vignettes/aperçus | Générés automatiquement |
| Protection | **Jeton d'intégration** (`SHA256(clé + video_id + expiration)`) pour le lecteur iframe + **authentification par jeton CDN** pour les URL directes (playlists, segments, MP4, vignettes) ; restriction par domaine référent |
| Coûts (indicatifs) | Encodage standard inclus ; stockage ~0,01 $/Go/région ; diffusion Afrique/Moyen-Orient ~0,06 $/Go sur le réseau standard (plus cher que l'Europe ~0,01 $) |

**Estimation d'ordre de grandeur** (à recalculer avec la durée réelle des épisodes **[D-07]**) : un épisode de 10 min en 720p ≈ 100–150 Mo → ≈ 0,006–0,009 $ de diffusion par visionnage en Afrique, soit ~1 % à 2 % d'un prix de 300 FCFA (~0,46 €). Supportable. Les épisodes **gratuits** coûtent aussi en bande passante : à surveiller.

### 6.2 Mise en œuvre de la protection
1. Activer dans la bibliothèque Bunny : **authentification du jeton d'intégration**, **authentification par jeton CDN**, **domaines autorisés** (domaine de production uniquement), **désactiver le repli MP4** pour les épisodes payants si possible.
2. Le navigateur appelle `GET /api/playback/:episodeId`. Le serveur vérifie RM-01, puis génère une URL de lecture signée expirant après **quelques minutes** (recommandation Bunny : 1 à 5 min pour le jeton).
3. Les épisodes gratuits passent aussi par ce point (sans vérification de droit) : cela empêche l'intégration sauvage sur d'autres sites.
4. La clé de signature n'est **jamais** exposée. Les identifiants vidéo ne figurent pas dans les pages publiques ; en revanche, l'URL du lecteur intégré contient l'identifiant de la vidéo une fois la lecture autorisée. **Ce n'est pas un problème** : la protection repose sur les jetons (embed + CDN), pas sur le secret de l'identifiant.
5. **Tests obligatoires (prototype S2 puis pré-lancement)** :
   - copier l'URL de playlist HLS depuis les outils du navigateur → refusée après expiration et depuis un autre domaine ;
   - un épisode complet se lit jusqu'au bout même si sa durée dépasse la validité du jeton (vérifier comment le lecteur Bunny renouvelle l'accès aux segments ; ajuster la durée du jeton si nécessaire).

### 6.3 Limites honnêtes
- Aucun système ne peut empêcher **l'enregistrement d'écran** ou le filmage d'un écran. Les jetons empêchent le **partage de liens**, pas la copie par un utilisateur déterminé.
- Pendant la courte validité d'un jeton, un lien copié fonctionne.
- Un DRM complet (Widevine/FairPlay — Bunny propose une offre « MediaCage » **[à vérifier : prix et compatibilité]**) rend l'extraction des fichiers beaucoup plus difficile, mais n'empêche pas non plus l'enregistrement d'écran et ajoute coût et incompatibilités. **Reporté**, à réévaluer si du piratage est constaté.
- Mesures dissuasives possibles plus tard : filigrane visible avec le numéro partiellement masqué de l'acheteur.

### 6.4 Lecteur **[D-13]**
- **V1 recommandé** : lecteur intégré Bunny (iframe), couleurs personnalisées, signé côté serveur. Moins de code, moins de risques.
- **Plus tard** : lecteur sur mesure (ex. hls.js/Vidstack) si l'expérience souhaitée l'exige (contrôle total de l'interface, statistiques fines).

## 7. Authentification (résumé)

Détails et justification : SECURITY_REQUIREMENTS §3.

### 7.1 Clients : sessions serveur maison

**Pourquoi pas Supabase Auth pour les clients ?** Supabase Auth ne connaît pas le PIN. L'idée initiale (mot de passe interne dérivé, PIN vérifié par notre serveur) a été écartée après revue : les points d'accès publics de Supabase Auth (connexion par OTP SMS, changement de mot de passe ou de numéro depuis le navigateur) permettraient de **contourner le PIN** et nos limites anti-fraude SMS, et la fuite d'un seul secret de dérivation exposerait tous les comptes.

**Conception retenue (simple et maîtrisée) :**
- Table `customers` (numéro, statut) et `pin_credentials` (PIN haché **Argon2id + poivre**) dans notre base.
- **OTP SMS** : code généré par notre serveur, stocké **haché** avec expiration (`otp_challenges`), envoyé via le prestataire SMS ; limites SEC-11 à SEC-14 appliquées avant tout envoi.
- **Session** : à la connexion réussie, le serveur génère un jeton aléatoire de 256 bits, en stocke le **hachage** dans `customer_sessions`, et place le jeton dans un cookie `httpOnly`, `Secure`, `SameSite=Lax`. Chaque requête authentifiée vérifie la session **et** le statut du client.
- Conséquences directes : blocage d'un compte, changement de PIN ou « déconnexion de tous les appareils » = **suppression immédiate des sessions en base**, effet instantané.
- Code d'authentification limité, testé intégralement (prototype S1), sans bibliothèque cryptographique maison : Argon2id via une bibliothèque reconnue, aléa cryptographique du système.

### 7.2 Administrateurs : Supabase Auth
- Comptes **séparés** des clients, e-mail + mot de passe fort + **TOTP obligatoire** **[D-06]**.
- Chaque action admin vérifie côté serveur : session Supabase valide, **niveau MFA `aal2`**, rôle dans `staff_roles`.
- Configuration Supabase Auth durcie : inscriptions publiques **désactivées** (admins créés manuellement), fournisseur « phone » **désactivé**, changement de mot de passe sécurisé, limites de débit d'Auth actives (LAUNCH_CHECKLIST).

## 8. Environnements et configuration

| Environnement | Usage | Base | Paiement | Vidéo |
|---|---|---|---|---|
| Local | Développement | Supabase local ou projet de dev | Sandbox | Bibliothèque de test |
| Préproduction (*preview*) | Recette | Projet Supabase **séparé** | Sandbox | Bibliothèque de test |
| Production | Public | Projet Supabase de prod | Live | Bibliothèque de prod |

Variables d'environnement (noms indicatifs, aucune valeur dans le dépôt) :

| Variable | Côté | Rôle |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | URL du projet |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | Utilisée uniquement pour la connexion admin ; ne donne accès à aucune donnée (RLS sans politique) |
| `SUPABASE_SERVICE_ROLE_KEY` | **serveur** | Accès complet — jamais au navigateur |
| `PIN_PEPPER` | **serveur** | Secret ajouté au hachage des PIN |
| `HASH_SECRET` | **serveur** | HMAC des numéros/IP dans les journaux |
| `PAYACCT_<CODE>_*` (ex. `PAYACCT_CINETPAY_XOF_API_KEY`, `…_SITE_ID`, `…_SECRET_KEY` ; `PAYACCT_FEDAPAY_XOF_SECRET_KEY`, `…_WEBHOOK_SECRET`) | **serveur** | Identifiants **par compte de paiement** ; la base ne stocke que le code du compte (`credentials_ref`), jamais les clés |
| `BUNNY_STREAM_LIBRARY_ID` | serveur | Bibliothèque vidéo |
| `BUNNY_STREAM_API_KEY` | **serveur** | Gestion des vidéos |
| `BUNNY_TOKEN_SECURITY_KEY` / `BUNNY_CDN_TOKEN_KEY` | **serveur** | Signature des URL |
| `TURNSTILE_SITE_KEY` (public) / `TURNSTILE_SECRET_KEY` (serveur) | mixte | Anti-robot |
| `SMS_PROVIDER_*` | **serveur** | Envoi OTP |
| `BUNNY_WEBHOOK_*` | **serveur** | Selon le mécanisme d'authentification proposé par Bunny **[à vérifier]** |
| `SENTRY_DSN` | public | Remontée d'erreurs |
| `CRON_SECRET` | **serveur** | Protection des routes cron |
| `APP_BASE_URL` | serveur | URL de retour paiement |

Un fichier `.env.example` (sans valeurs) sera créé au début du développement.

## 9. Observabilité
- **Sentry** : erreurs serveur et navigateur, sans données personnelles (numéros masqués).
- **Journal applicatif** des paiements : chaque événement prestataire est conservé (table `payment_events`).
- **Alertes P0 (dès le lancement)**, via les alertes e-mail de Sentry (aucun service supplémentaire) : commande `needs_review`, paiement en double (`is_duplicate_payment`), dépassement du budget SMS quotidien, erreurs du webhook de paiement.
- Alertes P1 : taux d'échec de paiement anormal, pic de tentatives de PIN, comptes verrouillés à répétition.

## 10. Coûts mensuels indicatifs (à confirmer) **[D-12]**

| Poste | Ordre de grandeur |
|---|---|
| Vercel Pro | ~20 $/mois par membre |
| Supabase Pro | ~25 $/mois (le plan gratuit met en pause les projets inactifs : inadapté à la production) |
| Bunny Stream | à la consommation (stockage + diffusion), quelques $ à quelques dizaines de $ au départ |
| Sentry | gratuit au départ |
| SMS OTP | **variable et potentiellement important** : prix par SMS selon pays/opérateur ; à chiffrer **[D-16]** |
| Prestataires de paiement | commission par transaction, variable selon pays/opérateur ; éventuels frais de compte ou d'abonnement par compte marchand **[à vérifier]** |
| Nom de domaine | ~10–20 $/an |

## 11. Risques techniques

| Risque | Impact | Mitigation |
|---|---|---|
| Erreur dans le code d'authentification maison | Comptes compromis | Périmètre réduit, prototype S1, tests exhaustifs, revue de sécurité indépendante |
| Webhooks perdus ou retardés | Client payé sans accès | Réconciliation automatique + revérification manuelle admin |
| Coût SMS / fraude au SMS (« SMS pumping ») | Facture élevée | Turnstile, limites par numéro/IP/pays, liste blanche des indicatifs pays |
| Couverture réelle des opérateurs différente des pages publiques | Paiements impossibles dans un pays | Vérification écrite auprès du prestataire et paiement réel de test avant d'ouvrir un marché |
| Comptes marchands impossibles à ouvrir hors du pays de la société | Marchés XAF/CDF/GNF non monétisables | Clarifier tôt (§5.7) ; partenaire local ou prestataire supplémentaire branché via un nouvel adaptateur |
| Complexité de plusieurs prestataires et comptes | Plus de tests et de support | Interface commune, tests de contrat par adaptateur, sandbox par compte, routes désactivables |
| Bande passante Afrique plus chère | Marges | Qualités adaptées, suivi des coûts mensuels |
| Pas de région cloud en Afrique | Latence | Pages légères, cache CDN, région Europe la plus proche |
