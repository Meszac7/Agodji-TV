# Agodjié TV — Exigences produit (PRD)

> Statut : Phase 1 — à valider par le fondateur.
> Les références **[D-xx]** renvoient au registre des décisions de PROJECT_BRIEF.md §8.
> Priorités : **P0** = indispensable au lancement, **P1** = souhaitable en V1 si le temps le permet, **P2** = après lancement.

---

## 1. Périmètre V1 (13 fonctions essentielles)

| # | Fonction | Priorité |
|---|---|---|
| 1 | Page d'accueil | P0 |
| 2 | Catalogue des séries | P0 |
| 3 | Fiche série | P0 |
| 4 | Saisons et liste d'épisodes | P0 |
| 5 | Lecture des épisodes gratuits | P0 |
| 6 | Inscription et connexion | P0 |
| 7 | Achat d'un épisode | P0 |
| 8 | Achat d'un pass saison | P0 |
| 9 | Vérification des paiements côté serveur | P0 |
| 10 | Lecture protégée des épisodes payants | P0 |
| 11 | Bibliothèque personnelle | P0 |
| 12 | Tableau de bord d'administration | P0 |
| 13 | Statistiques de base | P0 |

## 2. Parcours visiteur (sans compte)

**FR-01 — Navigation libre.** Toutes les pages publiques (accueil, catalogue, fiches série, listes d'épisodes) et les **épisodes gratuits** sont accessibles sans compte, **depuis n'importe quel pays**, quel que soit l'état des paiements dans ce pays.

**FR-02b — Pays d'affichage des prix.** Les prix affichés correspondent à un pays d'affichage estimé par l'adresse IP, visible et modifiable (« Prix pour : Bénin ▾ »). Si ce pays est inconnu, les prix du **Bénin** (grille XOF) sont affichés avec la mention claire « Prix indicatifs — modifiables selon votre pays » **[D-21]**. Ce choix est mémorisé sur l'appareil.

**FR-02 — Page d'accueil.**
- Une bannière principale mettant en avant la série disponible (affiche grand format, titre, accroche, bouton « Regarder l'épisode 1 » si gratuit).
- Une rangée « Disponible maintenant » et une rangée « Bientôt disponible ».
- Le contenu mis en avant est choisi par l'administrateur (champ « mis en avant » sur la série).

**FR-03 — Catalogue.** Grille de toutes les séries publiées, avec statut visible : *Disponible* / *Bientôt*. Pas de recherche ni de filtres en V1 (6 séries seulement) — P2.

**FR-04 — Fiche série.** Affiche, bannière, titre, synopsis, genre(s), classification d'âge **[D-08]**, mention IA **[D-10]**, saisons, liste d'épisodes. Pour une série « bientôt » : date ou mention « prochainement », pas d'épisodes jouables.

**FR-05 — Liste d'épisodes.** Pour chaque épisode : numéro, titre, vignette, durée, résumé court, et un **badge d'accès** clair :
- `Gratuit`
- `300 FCFA` (prix de la grille du pays de l'utilisateur ; pour un visiteur, pays estimé par géolocalisation, modifiable via un sélecteur de pays)
- `Acheté` / `Inclus dans votre pass` (si connecté et propriétaire)

Le bouton « Acheter le pass saison — 1 500 FCFA » est visible en haut de la liste de la saison, avec le nombre d'épisodes inclus.

**FR-06 — Épisode gratuit.** Lecture immédiate sans compte. À la fin de l'épisode : proposition de l'épisode suivant (gratuit → lecture ; payant → écran d'achat).

**FR-07 — Épisode payant pour un visiteur.** Un clic ouvre un écran d'achat expliquant les deux options (épisode / pass). L'authentification n'est demandée **qu'au moment de payer**.

## 3. Authentification

Voir SECURITY_REQUIREMENTS §3 pour les règles détaillées.

**FR-10 — Inscription.**
1. Saisie du numéro de téléphone (sélecteur de pays, format international E.164).
2. Réception d'un code SMS à usage unique (OTP) et saisie **[D-05]**.
3. Choix d'un PIN (4 chiffres **[D-04]**) et confirmation. Les PIN trop simples sont refusés (0000, 1234, 1111, etc.).
4. Acceptation des CGU / politique de confidentialité (case à cocher).
5. L'utilisateur est connecté et revient exactement là où il était (ex. écran d'achat).

Pas d'e-mail requis. Le nom affiché est facultatif.

**FR-11 — Connexion.** Numéro + PIN. Session longue (l'utilisateur ne retape pas son PIN à chaque visite sur le même appareil).

**FR-12 — PIN oublié.** Code SMS au numéro enregistré → nouveau PIN. Toutes les autres sessions sont fermées.

**FR-13 — Gestion du compte.** Changer de PIN (avec l'ancien PIN), se déconnecter, se déconnecter de tous les appareils, demander la suppression du compte (P1).

**FR-14 — Changement de numéro.** V1 : par demande au support, traité par un administrateur (procédure manuelle documentée). P2 : en libre-service.

## 4. Achat et paiement

**FR-20 — Écran d'achat.** Récapitulatif : ce qui est acheté, prix, devise, pays de paiement, moyen de paiement. Si l'utilisateur possède déjà certains épisodes de la saison, un avertissement l'indique avant l'achat du pass **[D-08]**.

**FR-27 — Pays de paiement (choisi par l'utilisateur).** **[D-17]** Le pays du numéro n'est jamais considéré comme pays de résidence ou de facturation.
- Premier achat : question unique « Dans quel pays se trouve votre compte Mobile Money ou votre carte ? », avec une suggestion présélectionnée (pays d'affichage choisi → pays estimé par IP → indicatif du numéro) que l'utilisateur **confirme d'un geste** ou change.
- Achats suivants : le dernier pays confirmé est rappelé (« Payer depuis : Côte d'Ivoire · Changer »), sans nouvelle question.
- Seuls les pays où l'achat est possible pour cet utilisateur sont sélectionnables ; les autres sont visibles mais grisés « bientôt disponible ».
- Changer de pays recalcule immédiatement le prix (grille du pays) et les moyens proposés.
- Aucun pays disponible : message « Le paiement n'est pas encore disponible dans votre pays. Vous pouvez continuer à regarder les épisodes gratuits. »

**FR-28 — Moyens de paiement proposés automatiquement.** Seuls les moyens réellement disponibles pour le pays choisi sont affichés (ex. « Mobile Money — MTN, Moov, Celtiis », « Carte bancaire — Visa, Mastercard »). L'utilisateur choisit la famille de moyen ; le serveur choisit le prestataire et le compte selon la configuration (route principale, puis secours). L'utilisateur n'a jamais à choisir entre « CinetPay » et « FedaPay ».

**FR-29 — Indisponibilité d'un prestataire.** Si un prestataire est désactivé ou en panne, le moyen est servi par la route de secours si elle existe ; sinon il disparaît temporairement du pays, sans erreur technique visible.

**FR-21 — Achats interdits.** Le serveur refuse :
- l'achat d'un épisode gratuit ;
- l'achat d'un épisode déjà possédé (à l'unité ou via pass) ;
- l'achat d'un pass déjà possédé ;
- l'achat d'un contenu non publié ou d'une série « bientôt » ;
- un pays non ouvert à l'achat, ou un moyen sans route active pour ce pays.

**FR-22 — Paiement.** Redirection vers la page de paiement du prestataire (Mobile Money, carte si disponible). Le prix est **toujours calculé par le serveur** à partir de la base, jamais transmis par le navigateur.

**FR-23 — Retour de paiement.** Au retour, l'utilisateur voit « Vérification de votre paiement… ». La page interroge le serveur jusqu'à confirmation. **Le retour navigateur n'accorde jamais l'accès** : seul le serveur, après vérification auprès du prestataire, débloque le contenu.

**FR-24 — Résultats possibles.**
- *Réussi* → « Paiement confirmé » + bouton « Regarder maintenant ».
- *Échoué / annulé* → message clair + bouton « Réessayer ».
- *En attente* (au-delà de ~2 min) → « Votre paiement est en cours de traitement. Vous serez débloqué automatiquement dès confirmation. Il apparaîtra dans votre bibliothèque. »

**FR-25 — Pas de double débit applicatif.** Un double clic ou un retour arrière ne crée pas deux commandes payées pour le même contenu (voir SECURITY_REQUIREMENTS §5).

**FR-26 — Reçu.** Chaque commande payée apparaît dans « Mes achats » avec date, montant, référence. Pas d'envoi SMS de reçu en V1 (coût) — P2.

## 5. Lecture vidéo

**FR-30 — Lecteur.** Lecture adaptative (qualité ajustée au débit), plein écran, reprise, contrôle de qualité manuel. Format selon **[D-07]**.

**FR-31 — Accès protégé.** Pour un épisode payant, le serveur vérifie le droit d'accès puis génère un **lien de lecture signé et à durée courte**. Copier ce lien ne permet pas à un tiers de regarder au-delà de sa courte durée de validité (voir SECURITY_REQUIREMENTS §6 pour les limites).

**FR-32 — Économie de données (P1).** Qualité de départ modérée par défaut ; l'utilisateur peut forcer une qualité basse.

**FR-33 — Reprise de lecture (P1).** Mémoriser la position de lecture par épisode pour un utilisateur connecté.

## 6. Bibliothèque personnelle

**FR-40 —** Page « Ma bibliothèque » listant :
- les passes saison possédés (avec tous les épisodes publiés de la saison, y compris les nouveaux) ;
- les épisodes achetés à l'unité ;
- un accès direct à la lecture.

**FR-41 —** Un nouvel épisode ajouté à une saison dont l'utilisateur a le pass apparaît automatiquement, sans action de sa part.

## 7. Administration

Interface web réservée aux administrateurs, accessible sous `/admin`, sur le même site. Simple, en français, utilisable sur ordinateur (le mobile est secondaire pour l'admin).

### 7.1 Contenu
- **FR-50** Créer / modifier une série : titre, slug, synopsis, genres, affiche, bannière, format vidéo (vertical ou horizontal **[D-07]**), statut (`brouillon`, `bientôt`, `publiée`, `dépubliée`), mise en avant, ordre d'affichage.
- **FR-51** Créer / modifier une saison : numéro, titre, description, prix de l'épisode et du pass **par grille tarifaire**, nombre d'épisodes prévu.
- **FR-52** Créer / modifier un épisode : numéro, titre, résumé, vignette, durée, gratuit/payant, prix (par défaut celui de la saison, modifiable par épisode), statut, date de publication programmée.
- **FR-53** Vidéo : téléversement direct vers l'hébergeur vidéo depuis l'admin, **ou** association d'une vidéo déjà présente (identifiant). Affichage de l'état d'encodage.
- **FR-54** Publication programmée : un épisode « programmé » devient visible automatiquement à la date choisie.
- **FR-55** Garde-fous : impossible de publier un épisode payant (ou une saison) sans prix dans **chaque grille tarifaire utilisée par un pays ouvert à l'achat**, sans vidéo encodée ou sans vignette. Impossible d'ouvrir un pays à l'achat tant que des contenus payants publiés n'ont pas de prix dans sa grille ou qu'aucune route de paiement n'est active. Les prix sont validés contre les contraintes des prestataires (ex. multiple de 5). Avertissement avant de dépublier un contenu déjà acheté.

### 7.1 bis Marchés et paiements (réservé au rôle `admin`)
- **FR-56** Pays : statut de paiement (`indisponible`, `pilote` — achats réservés aux testeurs —, `ouvert`), SMS activés ou non pour l'indicatif, grille tarifaire, état des confirmations écrites A/B/C par prestataire (avec lien vers la réponse).
- **FR-56b** Comptes testeurs : marquer un client comme testeur pour les pays en statut `pilote` **[D-22]**.
- **FR-57** Grilles tarifaires : création (devise), rattachement des pays.
- **FR-58** Prestataires et comptes de paiement : activer / désactiver un prestataire ou un compte (les clés restent dans la configuration de l'hébergeur, jamais saisies dans l'admin).
- **FR-59** Routes : pour chaque pays et moyen (Mobile Money, carte, portefeuille), compte principal et compte de secours, opérateurs affichés, date du dernier paiement réel de contrôle.
- Toute modification de cette section est journalisée et demande une confirmation explicite.

### 7.2 Utilisateurs
- **FR-60** Liste des utilisateurs (numéro partiellement masqué par défaut, date d'inscription, nombre d'achats).
- **FR-61** Fiche utilisateur : historique d'achats, bibliothèque, sessions actives.
- **FR-62** Actions : bloquer / débloquer un compte, forcer la déconnexion, **accorder manuellement un accès** (geste commercial ou litige), avec motif obligatoire et journalisation.

### 7.3 Transactions
- **FR-70** Liste filtrable des paiements : statut (`en attente`, `réussi`, `échoué`, `annulé`, `expiré`, `à examiner`, `remboursé`), prestataire, montant, devise, date, utilisateur, contenu.
- **FR-71** Détail d'un paiement : références prestataire, historique des notifications reçues.
- **FR-72** Bouton « Revérifier auprès du prestataire » pour un paiement non réussi.
- **FR-73** File « À traiter » : paiements `à examiner` (montant incohérent) et paiements en double à rembourser, avec actions « valider », « refuser », « marquer remboursé ». Ces cas déclenchent aussi une **alerte e-mail** dès le lancement.

### 7.4 Statistiques (simples)
- **FR-80** Chiffre d'affaires et nombre d'achats (jour / 7 jours / 30 jours / total), par devise et par pays.
- **FR-84** Paiements par prestataire, compte et moyen : volume, taux de réussite, taux d'échec par route (pour détecter un opérateur défaillant).
- **FR-81** Répartition épisodes vs passes.
- **FR-82** Top séries et top épisodes (ventes, lectures).
- **FR-83** Utilisateurs : inscrits, nouveaux inscrits sur la période, acheteurs, taux de conversion inscrits → acheteurs.

### 7.5 Rôles
- **FR-90** Deux rôles en V1 : `admin` (tout) et `editor` (contenu uniquement, pas d'accès aux données utilisateurs ni aux transactions) — P1 pour `editor`.
- **FR-91** Toute action sensible (prix, accès manuel, blocage, dépublication) est journalisée (qui, quoi, quand).

## 8. Règles métier

| Règle | Énoncé | Statut |
|---|---|---|
| RM-01 | Un utilisateur a accès à un épisode si : l'épisode est gratuit **ou** il possède l'épisode **ou** il possède le pass de la saison de l'épisode. | Validé |
| RM-02 | Un pass saison couvre tous les épisodes publiés de la saison, présents et futurs. | Validé |
| RM-03 | Les achats n'expirent pas. | Validé |
| RM-04 | Le prix appliqué est celui en vigueur au moment de la création de la commande ; il est figé dans la commande. | Recommandé |
| RM-05 | Un changement de prix n'affecte jamais les achats passés. | Recommandé |
| RM-06 | Pass après achats à l'unité : prix plein, avec avertissement (pas de déduction en V1). | **[D-08]** |
| RM-07 | Dépublication d'un contenu acheté : les acheteurs conservent l'accès sauf retrait pour raison légale. Un brouillon ou un épisode pas encore sorti n'est jamais lisible, même avec un pass. | **[D-08]** |
| RM-08 | Remboursement : manuel, au cas par cas, via le prestataire ; le droit d'accès est alors révoqué. | **[D-08]** |
| RM-09 | Taille d'une saison : nombre d'épisodes prévu affiché à l'achat du pass. | **[D-08]** |
| RM-10 | Un épisode payant passé en gratuit reste dans la bibliothèque de ceux qui l'ont acheté. | Recommandé |
| RM-11 | Le prix dépend de la grille tarifaire du **pays de paiement** choisi ; l'utilisateur paie dans la devise de ce pays. Pas de conversion automatique. | **[D-03]**, **[D-17]** |
| RM-12 | Un achat est valable partout : un contenu acheté dans un pays reste accessible si l'utilisateur voyage ou change de pays de paiement. | Recommandé |

## 9. Exigences non fonctionnelles

| ID | Exigence |
|---|---|
| NFR-01 | Mobile d'abord : toutes les pages utilisables dès 360 px de large. |
| NFR-02 | Page d'accueil < 1 Mo hors vidéo sur mobile ; images optimisées (WebP/AVIF), chargement différé. |
| NFR-03 | Temps d'affichage initial cible < 3 s en 4G moyenne (mesuré en phase de recette). |
| NFR-04 | Accessibilité : contrastes conformes WCAG 2.1 AA, navigation clavier, libellés explicites. |
| NFR-05 | Disponibilité : dépend des services managés ; pas d'engagement contractuel en V1. |
| NFR-06 | Langue : français **[D-15]**. Textes centralisés pour permettre la traduction plus tard. |
| NFR-09 | Panafricain : aucun pays, devise, prestataire ou opérateur codé en dur ; tout est configuration en base. |
| NFR-07 | Navigateurs : Chrome Android, Safari iOS, Samsung Internet, Opera Mini en mode non-extrême **[HYPOTHÈSE]**, navigateurs de bureau récents. |
| NFR-08 | Données personnelles : collecte minimale (numéro, PIN haché, achats). Conformité aux lois locales (voir LAUNCH_CHECKLIST). |

## 10. Reporté après la V1

| Fonction | Raison du report |
|---|---|
| Abonnement mensuel | Hors modèle de lancement |
| Portefeuille / crédits prépayés | Complexité comptable et réglementaire |
| Codes promo, parrainage, cartes cadeaux | Non essentiels |
| Prestataire supplémentaire pour les pays que CinetPay et FedaPay ne pourraient pas servir (après réponse écrite) | Voir [D-19] |
| Application mobile native / PWA installable | Le site mobile suffit pour valider le marché (PWA légère possible en P1) |
| Téléchargement hors-ligne | Nécessite DRM et application native |
| DRM complet (Widevine/FairPlay) | Coût et complexité ; à réévaluer si piratage constaté |
| Recherche, filtres | Catalogue de 6 séries |
| Notifications (SMS, push, « me prévenir ») | Coût SMS ; P2 |
| Avis, commentaires, notes | Modération nécessaire |
| Multi-profils, contrôle parental | Non essentiels |
| Multilingue, sous-titres multiples | P2 (les sous-titres FR peuvent être P1 si fournis) |
| Bandes-annonces | P1 si le fondateur les fournit |
| Changement de numéro en libre-service | Procédure manuelle en V1 |
