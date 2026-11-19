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
| 4 | Liste ordonnée des épisodes d'une série | P0 |
| 5 | Lecteur vertical en défilement continu + lecture des épisodes gratuits | P0 |
| 6 | Inscription et connexion (Google, e-mail + mot de passe) | P0 |
| 7 | Achat d'un épisode | P0 |
| 8 | Achat d'un pass série | P0 |
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

**FR-04 — Fiche série.** Affiche, bannière, titre, synopsis, genre(s), classification d'âge **[D-08]**, mention IA **[D-10]**, nombre d'épisodes et **durée totale** (calculée), liste ordonnée des épisodes. Pour une série « bientôt » : date ou mention « prochainement », pas d'épisodes jouables.

**FR-05 — Liste d'épisodes.** Pour chaque épisode : numéro, titre, vignette, durée, résumé court, et un **badge d'accès** clair :
- `Gratuit`
- `300 FCFA` (prix de la grille du pays de l'utilisateur ; pour un visiteur, pays estimé par géolocalisation, modifiable via un sélecteur de pays)
- `Acheté` / `Inclus dans votre pass` (si connecté et propriétaire)

Le bouton « Débloquer toute la série — 1 500 FCFA » (pass série) est visible en haut de la liste des épisodes, avec le nombre d'épisodes et la mention « y compris les prochains ». Il disparaît si l'utilisateur possède déjà le pass.

**FR-06 — Épisode gratuit.** Lecture immédiate sans compte, dans le lecteur vertical (§5). Le défilement continue vers l'épisode suivant (gratuit → lecture ; payant → diapositive de déblocage, FR-38).

**FR-07 — Épisode payant pour un visiteur.** La diapositive de déblocage explique les deux options (épisode / pass). La connexion (Google ou e-mail) n'est demandée **qu'au moment de payer**, sans quitter le lecteur.

## 3. Comptes et authentification

Voir SECURITY_REQUIREMENTS §3 et la décision `docs/decisions/2026-11-20-comptes-google-email-lecteur-vertical.md`. **Aucune fonction ne dépend d'un service SMS.**

**FR-10 — Inscription / connexion avec Google.** Un bouton « Continuer avec Google ». Au premier passage, le compte est créé ; aux suivants, l'utilisateur est connecté. Aucun mot de passe à retenir.

**FR-11 — Inscription avec e-mail et mot de passe.**
1. Adresse e-mail + mot de passe (au moins 10 caractères) + acceptation des CGU / politique de confidentialité.
2. E-mail de confirmation avec lien. **Tant que l'adresse n'est pas confirmée, le compte ne peut pas se connecter** (sécurité, SEC-02) : l'utilisateur continue comme visiteur (épisodes gratuits) et peut renvoyer l'e-mail.
3. Après confirmation, l'utilisateur revient exactement là où il était (ex. écran d'achat dans le lecteur).

**FR-12 — Connexion par e-mail et mot de passe.** Session longue sur l'appareil (pas de reconnexion à chaque visite).

**FR-13 — Mot de passe oublié.** Lien de réinitialisation envoyé par e-mail. Après changement, les autres sessions sont fermées.

**FR-14 — Mon compte.**
- Nom affiché (facultatif).
- **Numéro de téléphone facultatif**, ajouté à tout moment, **sans vérification par SMS**. Il est affiché comme « non vérifié », ne sert **jamais** à se connecter, à récupérer le compte ni à déterminer le pays de paiement. Usage futur possible : contact du support, préremplissage du numéro Mobile Money (avec confirmation de l'utilisateur).
- Méthodes de connexion : voir celles liées au compte, **ajouter Google** ou **définir un mot de passe** ; retirer une méthode seulement s'il en reste une autre.
- Changer d'adresse e-mail (confirmation sur l'ancienne et la nouvelle adresse).
- Se déconnecter, se déconnecter de tous les appareils, demander la suppression du compte (P1).

**FR-15 — Liaison des comptes (ne jamais perdre ses achats).**
- Achats, bibliothèque et progression sont rattachés au **compte**, jamais à la méthode de connexion.
- Même adresse e-mail confirmée avec Google et avec mot de passe → un seul compte.
- Adresses différentes → l'utilisateur lie lui-même ses méthodes depuis « Mon compte » (FR-14).
- Deux comptes créés par erreur → demande au support ; un administrateur peut transférer les achats après vérification (FR-62).

**FR-16 — Connexion au bon moment.** La connexion n'est demandée qu'au moment d'acheter (ou pour la reprise de lecture synchronisée entre appareils). Elle s'ouvre par-dessus le lecteur, sans perdre l'épisode en cours.

**Reporté** : connexion par numéro de téléphone + code (PIN), connexion par lien magique, autres réseaux sociaux.

## 4. Achat et paiement

**FR-20 — Écran d'achat.** Récapitulatif : ce qui est acheté, prix, devise, pays de paiement, moyen de paiement. Si l'utilisateur possède déjà certains épisodes de la série, un avertissement l'indique avant l'achat du pass **[D-08]**.

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

## 5. Visionnage — lecteur vertical et défilement continu (fonctionnalité centrale)

L'expérience de visionnage s'inspire de la **navigation verticale** des plateformes de vidéos courtes, adaptée aux séries épisodiques : *ouvrir une série, regarder, faire défiler, continuer*. Elle ne cherche pas à reproduire une application existante. Décision de référence : `docs/decisions/2026-11-20-comptes-google-email-lecteur-vertical.md`.

### 5.1 Entrée dans le lecteur

**FR-30 — Lancer une série.** Depuis la fiche série (résumé, liste des épisodes), le bouton principal lance :
- le **premier épisode** si l'utilisateur n'a rien regardé ;
- sinon « **Reprendre — Épisode 4 à 6:12** » (position exacte).
Dès l'entrée, l'expérience devient **immersive** : la vidéo occupe presque tout l'écran du téléphone, l'interface du site disparaît.

### 5.2 Format d'image

**FR-31 — Vertical et horizontal, sans déformation.**
- Format défini **par série** (vertical 9:16 privilégié, horizontal 16:9 accepté) **[D-07]**.
- La vidéo est toujours affichée **entière, sans déformation ni recadrage abusif**. S'il reste des zones vides (écran plus allongé que la vidéo, ou vidéo horizontale sur téléphone tenu verticalement), elles sont comblées par un **fond flou** tiré de l'image.
- Vidéo horizontale : affichée au centre ; le bouton plein écran passe en **paysage** (rotation proposée quand le navigateur le permet).

### 5.3 Navigation entre les épisodes

**FR-32 — Défilement vertical.**
- **Glisser vers le haut** : épisode suivant. **Glisser vers le bas** : épisode précédent. Transition fluide, une diapositive = un épisode.
- Sur ordinateur : flèches haut/bas du clavier, molette, et boutons ▲ ▼ à côté de la vidéo.
- L'épisode suivant est **préchargé** pour démarrer sans attente.

**FR-33 — Enchaînement automatique.** À la fin d'un épisode, passage automatique au suivant **s'il est accessible**. Si le suivant est payant et non débloqué, le défilement s'arrête sur sa diapositive de déblocage (FR-38) : **jamais de lecture ni de paiement automatique** vers un contenu payant.

**FR-34 — Liste des épisodes à la demande.** Un bouton discret « Épisodes » ouvre un panneau listant les épisodes de la série dans l'ordre (état : vu, en cours, gratuit, débloqué, verrouillé, bientôt) pour sauter directement à l'un d'eux, puis refermer et continuer à défiler. L'utilisateur n'a **jamais besoin** de ce panneau pour enchaîner.

### 5.4 Commandes (discrètes)

**FR-35 — Interface minimale.** L'écran montre surtout la vidéo. Les commandes apparaissent au toucher et disparaissent après ~3 s :
- **toucher** au centre : lecture / pause (icône brève) ;
- **son** : activer / couper ;
- **barre de progression** fine, élargie au toucher pour se déplacer dans l'épisode ;
- **plein écran** ;
- **épisode précédent / suivant** (en plus du glissement) ;
- en haut, discret : « **Sang Royal · Épisode 3 / 8** » et bouton retour vers la fiche série ;
- bouton « Épisodes » (FR-34) et qualité (Auto / Économie de données / Haute qualité, FR-36).
Contrôles accessibles au clavier sur ordinateur (espace, flèches, M pour le son, F pour plein écran).

### 5.5 Qualité de diffusion

**FR-36 — Adaptation à la connexion.** Streaming adaptatif (qualité ajustée au débit), qualités basses disponibles (240p/360p), choix manuel Auto / Économie de données / Haute qualité mémorisé sur l'appareil, démarrage rapide en qualité modérée, indicateur de chargement discret. Temps cible jusqu'à la première image : < 3 s en 4G moyenne.

**FR-37 — Progression et reprise.**
- Position enregistrée régulièrement (toutes les ~10 s, à la pause, au changement d'épisode, à la fermeture) : côté serveur pour un utilisateur connecté (synchronisée entre appareils), sur l'appareil pour un visiteur.
- Épisode regardé à plus de ~95 % = « vu ».
- La fiche série et l'accueil (« Continuer à regarder ») proposent de reprendre **exactement** là où l'utilisateur s'était arrêté.
- Revenir à un épisode partiellement vu en faisant défiler reprend à sa position.

### 5.6 Droits d'accès dans le défilement

**FR-38 — Diapositive de déblocage.** Pour un épisode payant non débloqué, la diapositive montre l'image floutée de l'épisode, son titre et deux options claires :
- « **Débloquer toute la série — 1 500 FCFA** · tous les épisodes, y compris les prochains » (pass série, mis en avant) ;
- « Seulement cet épisode — 300 FCFA ».
L'achat se fait **sans quitter le lecteur** (connexion si nécessaire, puis paiement — simulé jusqu'à l'étape 7). Après confirmation, la diapositive se déverrouille et la lecture démarre ; tous les épisodes couverts deviennent lisibles dans le défilement **sans rechargement**.

**FR-39 — Pass série dans le défilement.** Avec le pass d'une série : **plus aucune demande de paiement** pour cette série (ni diapositive de déblocage, ni bouton d'achat) ; les nouveaux épisodes publiés apparaissent dans le défilement et sont lisibles immédiatement ; le pass n'expire pas. Le serveur vérifie quand même le droit avant chaque lecture.

**FR-39b — Reprise automatique après paiement.** Après un achat réussi depuis le lecteur, la lecture démarre automatiquement sur l'épisode débloqué, au début (ou à la position mémorisée), sans action supplémentaire.

**FR-40 — Épisode acheté à l'unité.** Seul cet épisode est débloqué ; les autres gardent leurs conditions d'accès (gratuit, payant).

**FR-41 — Épisode programmé.** Un épisode annoncé mais non encore publié apparaît comme diapositive « **Épisode 7 — disponible le 26 novembre** » (avec « inclus dans votre pass » si c'est le cas). Il n'est jamais lisible avant sa date.

### 5.7 Fin de série

**FR-42 — Fin de série.** Après le dernier épisode publié, une diapositive de fin « **Fin de la série** » :
- propose **d'autres séries** disponibles sur Agodjié TV (affiches ; un toucher ouvre la série) ;
- bouton **« Retour au catalogue »** ;
- si des épisodes sont encore annoncés (programmés) : « Prochain épisode le … » ;
- **jamais** de proposition de « saison suivante » : une nouvelle histoire est une nouvelle série, avec son propre pass.

### 5.8 Erreurs

**FR-43 — Gestion des erreurs.** Chaque erreur a un message clair et une action :

| Situation | Message | Action |
|---|---|---|
| Connexion perdue / trop faible | « Connexion trop faible. La lecture reprendra automatiquement. » | Nouvelle tentative automatique, « Réessayer », suggestion du mode économie de données |
| Lien de lecture expiré | — (invisible) | Renouvellement automatique, reprise à la même position |
| Accès refusé (achat remboursé, compte bloqué) | « Cet épisode n'est plus disponible pour votre compte. » | Diapositive de déblocage ou contact support |
| Paiement en vérification | « Votre paiement est en cours de vérification. » | Rafraîchissement automatique |
| Vidéo indisponible | « Cet épisode n'est pas disponible pour le moment. » | Passer au suivant ; incident remonté à l'équipe |
| Erreur inconnue | « Un problème est survenu pendant la lecture. » | « Réessayer » ; code discret pour le support |

**FR-44 — Mesures de qualité (P1).** Temps jusqu'à la première image, interruptions, erreurs, taux de complétion et d'enchaînement par épisode.

## 6. Bibliothèque personnelle

**FR-45 —** Page « Ma bibliothèque » listant :
- les **pass série** possédés (avec tous les épisodes publiés de la série, y compris les nouveaux) ;
- les épisodes achetés à l'unité ;
- un accès direct à la lecture.

**FR-46 —** Un nouvel épisode publié dans une série dont l'utilisateur a le pass apparaît automatiquement, sans action de sa part — dans la bibliothèque **et** dans le défilement du lecteur.

**FR-47 —** « Continuer à regarder » : séries en cours avec reprise directe dans le lecteur à la bonne position (FR-37).

## 7. Administration

Interface web réservée aux administrateurs, accessible sous `/admin`, sur le même site. Simple, en français, utilisable sur ordinateur (le mobile est secondaire pour l'admin).

### 7.1 Contenu (séries et épisodes — pas de saisons)
- **FR-50** Créer / modifier une série : titre, slug, synopsis, genres, affiche, bannière, format vidéo (vertical ou horizontal **[D-07]**), statut (`brouillon`, `bientôt`, `publiée`, `dépubliée`), mise en avant, ordre d'affichage, **prix du pass série et prix par défaut d'un épisode, par grille tarifaire**.
- **FR-51** Épisodes d'une série : **ajouter, modifier, supprimer** (un épisode déjà acheté ou déjà publié n'est jamais supprimé physiquement : il est dépublié), **réorganiser** par glisser-déposer (ordre 1 → N, sans trou ni doublon).
- **FR-52** Fiche épisode : titre, résumé, vignette, **durée** (renseignée automatiquement depuis la vidéo encodée quand c'est possible, sinon saisie), gratuit / payant, prix (par défaut celui de la série, modifiable par épisode), statut, publication immédiate ou programmée.
- **FR-53** Vidéo : téléversement direct vers l'hébergeur vidéo depuis l'admin, **ou** association d'une vidéo déjà présente (identifiant). Affichage de l'état d'encodage.
- **FR-54** Publication immédiate ou programmée : un épisode « programmé » devient visible automatiquement à la date choisie.
- **FR-54b** **Durée totale calculée automatiquement** et affichée en permanence (ex. « 8 épisodes · 12 min 40 / 15 min »). **Avertissements** (avec confirmation explicite, journalisée **[D-28]**) si :
  - un épisode dépasse **1 min 50** (repère : 1 min 30) ;
  - la série dépasse **10 épisodes** ;
  - la durée totale dépasse **15 minutes** (en comptant les épisodes publiés et programmés).
  Les limites sont des réglages modifiables.
- **FR-55** Garde-fous : impossible de publier un épisode payant sans prix (épisode et pass série) dans **chaque grille tarifaire utilisée par un pays en statut `pilote` ou `ouvert`**, sans vidéo encodée, sans durée ou sans vignette. Impossible de passer un pays en `pilote` ou `ouvert` tant que des contenus payants publiés n'ont pas de prix dans sa grille ou qu'aucune route de paiement n'est active. Les prix sont validés contre les contraintes des prestataires (ex. multiple de 5). Avertissement avant de dépublier un contenu déjà acheté.
- **FR-55b** Achats et droits : pour une série, voir le nombre de pass vendus et d'épisodes vendus ; pour un client, voir ses pass série et épisodes débloqués (§7.2, §7.3).

### 7.1 bis Marchés et paiements (réservé au rôle `admin`)
- **FR-56** Pays : statut de paiement (`indisponible`, `pilote` — achats réservés aux testeurs —, `ouvert`), grille tarifaire, état des confirmations écrites A/B/C par prestataire (avec lien vers la réponse).
- **FR-56b** Comptes testeurs : marquer un client comme testeur pour les pays en statut `pilote` **[D-22]**.
- **FR-57** Grilles tarifaires : création (devise), rattachement des pays.
- **FR-58** Prestataires et comptes de paiement : activer / désactiver un prestataire ou un compte (les clés restent dans la configuration de l'hébergeur, jamais saisies dans l'admin).
- **FR-59** Routes : pour chaque pays et moyen (Mobile Money, carte, portefeuille), compte principal et compte de secours, opérateurs affichés, date du dernier paiement réel de contrôle.
- Toute modification de cette section est journalisée et demande une confirmation explicite.

### 7.2 Utilisateurs
- **FR-60** Liste des utilisateurs (numéro partiellement masqué par défaut, date d'inscription, nombre d'achats).
- **FR-61** Fiche utilisateur : historique d'achats, bibliothèque, sessions actives.
- **FR-62** Actions : bloquer / débloquer un compte, forcer la déconnexion, **accorder manuellement un accès** (geste commercial ou litige), **transférer les achats** d'un compte créé par erreur vers le compte principal du même client (FR-15), avec motif obligatoire et journalisation.

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
| RM-01 | Un utilisateur a accès à un épisode si : l'épisode est gratuit **ou** il possède l'épisode **ou** il possède le **pass de la série** de l'épisode. Vérifié par le serveur avant **chaque** lecture. | Validé |
| RM-02 | Un pass série couvre tous les épisodes publiés de la série, présents et futurs. | Validé |
| RM-03 | Les achats n'expirent pas. | Validé |
| RM-04 | Le prix appliqué est celui en vigueur au moment de la création de la commande ; il est figé dans la commande. | Recommandé |
| RM-05 | Un changement de prix n'affecte jamais les achats passés. | Recommandé |
| RM-06 | Pass après achats à l'unité : prix plein, avec avertissement (pas de déduction en V1). | **[D-08]** |
| RM-07 | Dépublication d'un contenu acheté : les acheteurs conservent l'accès sauf retrait pour raison légale. Un brouillon ou un épisode pas encore sorti n'est jamais lisible, même avec un pass. | **[D-08]** |
| RM-08 | Remboursement : manuel, au cas par cas, via le prestataire ; le droit d'accès est alors révoqué. | **[D-08]** |
| RM-09 | Une série compte **10 épisodes au maximum**, durée cible 1 min 30 par épisode, **1 min 50 maximum** par épisode, **15 minutes maximum** au total (calculé). Dépassement : avertissement admin avec confirmation **[D-28]**. | Validé |
| RM-10 | Un épisode payant passé en gratuit reste dans la bibliothèque de ceux qui l'ont acheté. | Recommandé |
| RM-11 | Le prix dépend de la grille tarifaire du **pays de paiement** choisi ; l'utilisateur paie dans la devise de ce pays. Pas de conversion automatique. | **[D-03]**, **[D-17]** |
| RM-12 | Un achat est valable partout : un contenu acheté dans un pays reste accessible si l'utilisateur voyage ou change de pays de paiement. | Recommandé |
| RM-13 | Un pass série couvre **uniquement** sa série ; une nouvelle histoire est une nouvelle série, avec son propre pass. Il n'existe pas de saisons. | Validé |
| RM-16 | Un client qui possède le pass d'une série ne voit **plus jamais** de demande de paiement pour cette série. | Validé |
| RM-14 | L'enchaînement automatique ne lance jamais un épisode payant non débloqué et ne déclenche jamais de paiement ; tout achat exige une action explicite. | Validé |
| RM-15 | Les achats, la bibliothèque et la progression appartiennent au compte, pas à la méthode de connexion. | Validé |

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
| NFR-08 | Données personnelles : collecte minimale (e-mail, nom affiché facultatif, numéro facultatif non vérifié, achats). Conformité aux lois locales (voir LAUNCH_CHECKLIST). |

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
| Notifications (e-mail, push, « me prévenir ») | P2 ; aucun SMS payant |
| Avis, commentaires, notes | Modération nécessaire |
| Multi-profils, contrôle parental | Non essentiels |
| Multilingue, sous-titres multiples | P2 (les sous-titres FR peuvent être P1 si fournis) |
| Bandes-annonces | P1 si le fondateur les fournit |
| Connexion par numéro de téléphone + code (PIN) | Non développée au lancement (pas de SMS) |
