# Agodjié TV — Plan de développement V1

> Statut : **proposé, en attente du feu vert du fondateur**. Aucun code n'a été écrit.
> Principe : livrer en **petites étapes visibles**, chacune démontrée au fondateur, testée, et poussée sur GitHub. Les réponses commerciales et administratives (prestataires, juriste) **ne bloquent pas** la construction : des **simulateurs** remplacent les services externes tant qu'ils ne sont pas disponibles (TECHNICAL_ARCHITECTURE §12).

---

## 1. Ce qui bloque réellement le démarrage

| Élément | Bloquant pour démarrer ? | Pourquoi |
|---|---|---|
| **Validation de la maquette du lecteur vertical** | **Oui, pour coder le lecteur** (étape 2) | Exigence du fondateur (2026-11-20) |
| Comptes Supabase / Vercel | Non pour coder (base locale) — **recommandé avant la fin de l'étape 1** | Sans eux, vous ne pouvez voir l'avancement que par captures d'écran et vidéos ; avec eux, vous testez vous-même sur un lien de préproduction |
| Format vidéo (D-07) | Non | Format réglable par série ; utile pour les maquettes de l'étape 2 |
| Compte Bunny Stream | Non avant l'étape 6 | Les étapes 2 à 5 utilisent une vidéo de démonstration locale |
| Projet Supabase de préproduction + identifiant Google OAuth (D-25) | **Oui pour l'étape 3** | Supabase Auth (Google, e-mail) ne peut pas tourner localement sans Docker dans l'environnement de travail ; un projet Supabase gratuit de préproduction suffit |
| Comptes sandbox CinetPay / FedaPay | Non avant l'étape 7 | Simulateur de paiement pour tout le moteur d'achat |
| Réponses écrites des prestataires (D-20), juriste (D-09) | Non avant le pilote | Elles conditionnent l'ouverture des pays, pas le code |
| Logo, domaine, textes légaux | Non avant le pilote / lancement | Éléments provisoires jusque-là |

### Décisions à prendre, par échéance

| Échéance | Décisions |
|---|---|
| **Maintenant** | Feu vert sur ce plan · **envoyer les questions écrites aux prestataires (D-20)** — les délais de réponse sont hors de notre contrôle |
| Avant l'étape 2 (maquettes) | Durée moyenne des épisodes de la première série (D-07, utile pour les coûts) — le format vertical est validé |
| Avant l'étape 3 | Projet Supabase de préproduction et identifiant Google OAuth créés (D-25), guidés pas à pas ; confirmation de l'authentification admin (D-06) |
| Avant l'étape 4 | Authentification admin e-mail + TOTP (D-06) |
| Avant l'étape 5 | Validation des écrans d'achat et du choix du pays (D-17) |
| Avant l'étape 2 (lecteur) | **Validation de la maquette du lecteur vertical** (D-27) — lecteur sur mesure validé (D-13) |
| Avant l'étape 6 | Compte Bunny Stream |
| Avant l'étape 7 | Comptes **sandbox** CinetPay et FedaPay |
| Avant le pilote (étape 10) | Réponses des prestataires (D-20), stratégie d'encaissement (D-09), service d'envoi d'e-mails (D-24), prestataire principal par pays (D-18), politiques et textes légaux (D-08), mention IA (D-10), domaine (D-11), budget (D-12), liste des testeurs (D-22) |
| Avant chaque ouverture de pays hors XOF | Grille tarifaire de la monnaie (D-03), réponses A/B/C, (D-19 pour l'Afrique centrale non documentée) |
| Avant le lancement public | Logo et identité (D-14) |

## 2. Vue d'ensemble des étapes

| Étape | Livré au fondateur | Services externes nécessaires |
|---|---|---|
| 1 | Socle technique + guide de style visible | Aucun (recommandé : Supabase + Vercel de préproduction) |
| 2 | Maquettes du parcours complet, site public, **lecteur vertical en défilement continu** (vidéos de démonstration) | Aucun |
| 3 | Comptes clients : Google + e-mail/mot de passe, liaison des comptes, profil (numéro facultatif) | Projet Supabase de préproduction + identifiant Google OAuth |
| 4 | Administration : contenus, prix, publication | Aucun (Supabase local ou préproduction pour l'auth admin) |
| 5 | Achat complet avec paiement simulé, bibliothèque | Aucun (simulateur) |
| 6 | Vraies vidéos protégées (Bunny) | Compte Bunny |
| 7 | Adaptateurs CinetPay et FedaPay en sandbox | Comptes sandbox |
| 8 | Statistiques + administration des pays et paiements | — |
| 9 | Durcissement, revue de sécurité, recette mobile | — |
| 10 | Pilote : achats réels par des testeurs dans plusieurs pays | Comptes live, service d'e-mails, domaine, réponses prestataires |
| 11 | Ouverture progressive au public | Par pays, selon LAUNCH_CHECKLIST §9 |

Les étapes 6 et 7 peuvent être avancées ou menées en parallèle dès que les comptes correspondants existent.

## 3. Détail des étapes

Chaque étape indique : **livrables**, **tests automatisés**, **validation par le fondateur**, **critère de sortie**. Une fiche de recette en français (`docs/recette/etape-N.md`) liste les vérifications à faire vous-même.

### Étape 1 — Socle technique et guide de style

**Livrables**
- Projet Next.js + TypeScript strict, Tailwind, jetons de design (sombre par défaut, clair disponible, choix mémorisé), polices Figtree et Roboto.
- Page « guide de style » (préproduction uniquement) : couleurs, typographie, boutons, badges, cartes d'affiche et d'épisode, états.
- Base de données : migrations versionnées pour le catalogue, les pays, les grilles tarifaires (XOF 300 / 1 500 pré-rempli, autres grilles vides), les prestataires, comptes et routes, les réglages ajustables (`app_settings`) ; RLS verrouillé ; données de démonstration réalistes (6 séries, dont 1 disponible).
- Interfaces `PaymentProvider`, `SmsProvider`, `VideoProvider` et leurs **simulateurs** (non utilisables en production).
- En-têtes de sécurité, `.env.example`, Sentry (désactivé sans clé), CI GitHub Actions.

**Tests automatisés** : lint, typage, tests unitaires de base ; tests de base de données — avec la clé publique, **aucune** table ni fonction n'est accessible ; les migrations s'appliquent sur une base vide ; les simulateurs refusent de démarrer en mode production.

**Validation fondateur** : parcourir le guide de style sur mobile et ordinateur, en thème sombre et clair ; valider l'ambiance (jaune royal, rouge, typographie).

**Sortie** : CI verte, guide de style validé.

### Étape 2 — Site public et épisodes gratuits

**Livrables**
- **Maquettes du parcours utilisateur complet**, validées par le fondateur **avant** l'intégration (DESIGN_GUIDELINES §10) : découverte (accueil, catalogue) → fiche série → épisode gratuit dans le lecteur → épisode payant → écran d'achat (choix épisode/pass, confirmation du pays de paiement, moyen de paiement) → paiement **simulé** → vérification → confirmation → lecture du contenu débloqué → bibliothèque. Inclut connexion/inscription, états d'erreur et thèmes sombre/clair. Les maquettes sont **cliquables** (prototype navigable sur mobile), les paiements restent simulés.
- **Lecteur vertical en défilement continu** selon PRODUCT_REQUIREMENTS §5 (FR-30 à FR-44), conforme à la maquette validée : glisser haut/bas, enchaînement automatique, reprise (sur l'appareil pour les visiteurs), formats vertical et horizontal sans déformation, plein écran, qualité adaptative et économie de données, diapositives « verrouillé » / « bientôt » / fin de saison, gestion des erreurs — sur vidéos de démonstration HLS. Les cinq couches (interface, moteur, droits, progression, séquenceur) sont séparées (TECHNICAL_ARCHITECTURE §6.4).
- Accueil (bannière, rangées « Disponible » / « Bientôt »), catalogue, fiche série, saisons, liste d'épisodes avec badges d'accès et prix.
- Prix affichés pour le pays d'affichage : estimé par IP, **Bénin par défaut** avec la mention « Prix indicatifs — modifiables selon votre pays » (D-21), sélecteur de pays.
- Format d'affichage selon le réglage de la série (vertical ou horizontal).
- Lecture des épisodes gratuits via `/api/playback` (simulateur vidéo : vidéo de démonstration).
- Navigation mobile (barre inférieure), images optimisées.

**Tests automatisés** : lecteur et défilement (glisser haut/bas, enchaînement automatique, arrêt devant un épisode verrouillé, reprise à la bonne position, vidéo horizontale non déformée, plein écran, erreurs simulées : réseau coupé, lien expiré renouvelé, accès refusé) ; séquenceur (ordre, états, fin de saison, épisodes programmés) ; règles de visibilité (brouillon, programmé, publié, dépublié, série « bientôt ») ; `video_id` absent de toutes les données envoyées au navigateur ; prix affichés = grille du pays sélectionné ; parcours Playwright sur mobile (Android et iPhone émulés) et ordinateur ; budget de poids de page ; contrastes d'accessibilité.

**Validation fondateur** : 1) valider la maquette du lecteur vertical puis les maquettes du parcours complet ; 2) puis, sur le site, enchaîner les épisodes en faisant défiler sur votre téléphone (plein écran, reprise, connexion lente), changer le pays d'affichage, vérifier les textes.

**Sortie** : parcours visiteur fluide sur mobile, aucune donnée interne exposée.

### Étape 3 — Comptes clients (Google, e-mail + mot de passe)

**Prérequis** : projet Supabase de préproduction et identifiant Google OAuth (D-25) ; service d'e-mails de test (celui de Supabase suffit en préproduction).

**Livrables** : « Continuer avec Google » ; inscription e-mail + mot de passe avec confirmation d'e-mail ; connexion ; mot de passe oublié ; « Mon compte » (nom, numéro facultatif non vérifié, méthodes de connexion liées, ajouter Google / définir un mot de passe, changer d'e-mail, déconnexion de tous les appareils) ; connexion par-dessus le lecteur sans perdre l'épisode ; reprise de lecture synchronisée pour les connectés ; Turnstile.

**Tests automatisés** (SEC-01 à SEC-16, SEC-25) : compte non confirmé ne peut pas acheter ; **prise de contrôle anticipée** (compte e-mail non confirmé créé avec l'adresse d'un autre, puis connexion Google de la vraie personne) → aucun accès pour le tiers ; liaison Google ↔ e-mail conserve achats, bibliothèque et progression ; retrait de la dernière méthode refusé ; changement de mot de passe déconnecte les autres sessions ; client bloqué refusé même avec un jeton valide ; aucun client Supabase dans le navigateur ; numéro jamais utilisé pour se connecter.

**Validation fondateur** : créer un compte avec Google, un autre par e-mail, lier les deux méthodes, se déconnecter / se reconnecter, réinitialiser un mot de passe.

**Sortie** : tous les tests d'authentification et de liaison passent.

### Étape 4 — Administration du contenu

**Livrables** : connexion admin (e-mail + mot de passe + TOTP, D-06) ; rôles `admin` / `editor` ; séries, saisons, épisodes, affiches et vignettes ; prix par grille tarifaire (XOF pré-rempli, autres grilles vides et indépendantes) ; gratuit/payant ; publication, dépublication, programmation ; association d'une vidéo ; garde-fous de publication ; journal d'audit.

**Tests automatisés** : chaque action admin refusée sans session, sans TOTP (`aal2`) ou sans le bon rôle ; éditeur sans accès aux utilisateurs ni aux transactions ; garde-fous FR-55 (pas de publication payante sans prix dans les grilles des pays ouverts, prix contraires aux contraintes refusés) ; publication programmée effective à la bonne heure ; journalisation des actions sensibles.

**Validation fondateur** : créer seul une série complète (saison, épisodes, prix, publication programmée) sans aide technique.

**Sortie** : le fondateur gère le catalogue en autonomie.

### Étape 5 — Achat, paiement (simulé) et bibliothèque

**Livrables** : écrans d'achat conformes aux maquettes validées à l'étape 2 ; écran d'achat (épisode / pass),  **confirmation du pays de paiement** (D-17) et moyens proposés selon les routes ; commandes à prix figé ; moteur de paiement complet (webhooks, vérification, `confirm_order_payment`, réconciliation, expiration) branché sur le **simulateur** ; page de retour ; bibliothèque ; statuts de pays `unavailable` / `pilot` / `open` et comptes testeurs ; transactions et file « À traiter » dans l'admin ; alertes.

Le simulateur reproduit les scénarios réels : succès, échec, annulation, notification en double, notification tardive, notification perdue, montant différent, panne temporaire.

**Tests automatisés** (moteur indépendant du prestataire) :
- notification valide → un droit ; même notification ×5 et en parallèle → un seul droit ;
- traitement interrompu → réponse 500 puis relance réussie ;
- notification falsifiée ou signée avec le secret d'un autre compte → rejetée ;
- montant / devise / compte différents → `needs_review` + alerte ;
- retour navigateur « succès » sans paiement → aucun droit ;
- notification perdue → récupérée par la réconciliation ; commande `failed`/`expired` finalement payée → créditée ;
- épisode et pass de la même saison payés en même temps → doublon signalé ; remboursement d'un doublon → droit d'origine conservé ;
- achat d'un contenu déjà possédé ou non publié → refusé ;
- pays `unavailable` → achat refusé, consultation et gratuits toujours accessibles ; pays `pilot` → achat réservé aux testeurs ;
- pays de paiement différent de l'indicatif → accepté s'il est ouvert ; pays modifié dans la requête vers un pays fermé → refusé ;
- route principale désactivée → bascule sur le secours ; aucune route → moyen masqué ; compte désactivé → commandes en cours toujours vérifiées ;
- pass saison → nouvel épisode ajouté visible automatiquement dans la bibliothèque ;
- reprise de lecture enregistrée côté serveur pour un client connecté ; achat depuis le lecteur puis lecture immédiate.

**Validation fondateur** : acheter un épisode puis un pass avec le paiement simulé, depuis deux « pays » différents ; voir la transaction dans l'admin ; provoquer un échec et un succès tardif.

**Sortie** : toute la logique d'argent et de droits est testée **avant** de toucher un vrai prestataire.

### Étape 6 — Vidéos réelles protégées (Bunny Stream)

**Livrables** : adaptateur Bunny (`VideoProvider`) ; téléversement depuis l'admin ; état d'encodage (webhook Bunny + vérification) ; lecture signée à durée courte ; restriction de domaine.

**Tests automatisés** : matrice d'accès (sans droit / épisode / pass / pass + nouvel épisode / brouillon ou non sorti → refusé / dépublié après achat → conservé / droit révoqué / client bloqué) ; limites d'émission de jetons.
**Tests manuels documentés** : lien copié refusé après expiration et depuis un autre domaine ; épisode complet lisible jusqu'au bout ; lecture sur Android et iPhone réels.

**Validation fondateur** : téléverser un vrai épisode, le regarder sur votre téléphone, essayer de partager le lien.

### Étape 7 — Adaptateurs CinetPay et FedaPay (sandbox)

**Livrables** : adaptateurs réels derrière `PaymentProvider` ; documentation des formats réels observés (notifications, statuts, contraintes de montant) ; configuration des comptes sandbox dans l'admin.

**Tests** : **suite de tests de contrat commune** que chaque adaptateur doit passer (la même que le simulateur) ; tests sur réponses enregistrées en sandbox ; scénarios réels en sandbox : succès, échec, annulation, nouvel essai, notifications multiples.

**Validation fondateur** : payer en sandbox avec chaque prestataire depuis le site de préproduction.

**Indépendance** : si un prestataire tarde, l'autre avance ; le reste de la plateforme n'attend pas.

### Étape 8 — Statistiques et administration des marchés

**Livrables** : tableau de bord (CA par devise et par pays, achats, épisodes vs passes, top séries/épisodes, utilisateurs, conversion, taux de réussite par prestataire et route) ; écrans pays / grilles / prestataires / comptes / routes / état des confirmations A/B/C ; comptes testeurs.

**Tests** : chiffres comparés à des données de test connues ; jamais d'addition entre devises ; actions réservées au rôle `admin` et journalisées.

**Validation fondateur** : lire les statistiques de démonstration ; configurer un pays en `pilot` avec une route de test.

### Étape 9 — Durcissement et recette

**Livrables** : revue de sécurité indépendante (paiements, authentification, base de données, vidéo, admin) et corrections ; recette sur appareils réels (Android d'entrée de gamme, iPhone) et réseau lent ; accessibilité ; performance ; test de restauration des sauvegardes ; chaque règle SEC-xx cochée avec sa preuve.

**Validation fondateur** : fiche de recette complète sur votre téléphone.

**Sortie** : aucun point de sécurité critique ouvert.

### Étape 10 — Pilote multi-pays

**Prérequis** : réponses écrites et contrat live avec au moins un prestataire pour les pays du pilote, service d'e-mails (D-24), domaine, textes légaux, liste des testeurs (D-22).

**Déroulé** : pays concernés en statut `pilot` ; achats réels de faible montant par les testeurs dans plusieurs pays ; remboursement testé ; suivi des coûts (bande passante, commissions, e-mails) et des taux de réussite par opérateur.

**Sortie** : paiements réels fiables dans au moins un pays ; liste des correctifs traitée.

### Étape 11 — Ouverture progressive

Chaque pays passe en `open` dès que LAUNCH_CHECKLIST §9 est complète ; les moyens de paiement s'ajoutent un par un. Aucune nouvelle version du code n'est nécessaire pour ouvrir un pays.

## 4. Stratégie de tests et de validation

| Niveau | Outil | Ce qu'il vérifie | Quand |
|---|---|---|---|
| Unitaires | Vitest | Règles métier : prix, accès (RM-01…RM-12), machine d'état des commandes, routage, validation des entrées | À chaque push |
| Base de données | Tests SQL sur un vrai PostgreSQL | Contraintes d'unicité, fonctions (`has_episode_access`, `confirm_order_payment`…), verrouillage RLS, **concurrence** (notifications simultanées) | À chaque push |
| Contrat prestataires | Suite commune | Simulateur, CinetPay et FedaPay se comportent pareil vu du moteur | À chaque push (réponses enregistrées) + manuellement en sandbox |
| Parcours | Playwright | Parcours visiteur, compte, achat, admin ; mobile (Android, iPhone émulés) et ordinateur ; réseau lent | À chaque push sur les parcours critiques |
| Sécurité | Tests dédiés + revue | Règles SEC-xx, tentatives de contournement (prix, pays, droits, liens vidéo) | À chaque étape + revue indépendante à l'étape 9 |
| Recette fondateur | Fiche en français | Ce que voit et ressent l'utilisateur | Fin de chaque étape |

Règles :
- Une étape n'est terminée que si la CI est verte **et** que le rapport indique les tests réellement exécutés avec leur résultat (y compris les échecs).
- Aucun test n'est désactivé pour « faire passer » une étape.
- Données de test réalistes (noms, numéros fictifs aux formats africains, prix en XOF), jamais en production.
- Les simulateurs sont **impossibles à activer en production** (SEC-44).

## 5. Après la V1 (ordre indicatif)

1. Ouverture à l'achat des pays restants dès confirmation (sans développement).
2. Prestataire supplémentaire seulement pour les pays que ni CinetPay ni FedaPay ne peuvent servir après réponse écrite (D-19).
3. Reprise de lecture, mode économie de données, application installable (PWA).
4. Notifications « nouvel épisode » selon les coûts.
5. Codes promo / offres de lancement.
6. Lecteur sur mesure, filigrane dynamique.
7. Portefeuille prépayé ou abonnement si les données le justifient.

## 6. Règles de travail

- Petites étapes, un push GitHub par avancée significative.
- Décisions techniques documentées dans `docs/decisions/`.
- Documents de cadrage mis à jour quand une décision change.
- Aucune étape démarrée sans le feu vert du fondateur.
