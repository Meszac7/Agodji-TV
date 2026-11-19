# Agodjié TV — Project Brief

> Statut : **Phase 1 — Cadrage (planification uniquement)**. Aucune ligne de code applicatif n'a encore été écrite.
> Dernière mise à jour : 2026-11-19.
> Les éléments marqués **[HYPOTHÈSE]** n'ont pas été validés par le fondateur. Les éléments marqués **[DÉCISION D-xx]** attendent son arbitrage (voir §8).

---

## 1. Vision

Agodjié TV est une plateforme de streaming africaine indépendante dédiée aux **séries dramatiques africaines**, notamment des productions créées avec l'intelligence artificielle.

L'objectif est d'offrir une expérience **premium, cinématographique et accessible**, pensée d'abord pour le **mobile** et pour les **réalités de paiement africaines** (Mobile Money).

Agodjié TV **n'est pas** un service de streaming généraliste au lancement : le catalogue est restreint, éditorialisé, et centré sur des séries maison.

## 2. Marchés cibles

**Orientation validée par le fondateur** : Agodjié TV est **panafricaine**, ouverte aux utilisateurs d'Afrique de l'Ouest et d'Afrique centrale couverts par nos solutions de paiement. Le lancement n'est pas limité artificiellement à quelques pays. La société exploitante est **béninoise**.

| Zone | Pays visés | Devise | Disponibilité technique observée (non confirmée pour notre compte) |
|---|---|---|---|
| UEMOA | Bénin, Côte d'Ivoire, Sénégal, Togo, Burkina Faso, Mali, Niger, Guinée-Bissau | XOF | CinetPay et/ou FedaPay selon le pays (Guinée-Bissau : aucune information) |
| Guinée | Guinée | GNF | CinetPay ; FedaPay (listée par son centre d'assistance) |
| CEMAC | Cameroun | XAF | CinetPay |
| CEMAC | Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale | XAF | **Aucune information trouvée** — à demander aux deux prestataires, **pas exclus** |
| RD Congo | RD Congo | CDF / USD | CinetPay |

Le détail par pays, opérateur et niveau de preuve est dans TECHNICAL_ARCHITECTURE §5.2. **Aucune capacité ni restriction des prestataires n'est considérée comme confirmée sans source officielle explicite ou réponse écrite** (questions prêtes : [docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md)).

**Activation progressive** (TECHNICAL_ARCHITECTURE §5.6) :
1. **Consultation** (catalogue, épisodes gratuits) : ouverte à tous, partout, sans compte — jamais bloquée par l'état des paiements.
2. **Création de compte** : possible dès que l'envoi de SMS est activé pour l'indicatif du numéro.
3. **Achat** : pays par pays et moyen par moyen, dès que trois points sont confirmés par écrit — **A** disponibilité technique, **B** accès pour notre société béninoise, **C** reversement des fonds — puis un paiement réel de contrôle.

**Points d'attention majeurs** :
- « FCFA » recouvre deux monnaies différentes (XOF et XAF), et la RDC et la Guinée n'utilisent pas le franc CFA. Les prix sont définis **par grille tarifaire et par devise** ([D-03]).
- Des indices officiels laissent penser que certains prestataires lient un compte marchand à un pays ou à une devise ; **ce n'est pas confirmé**. Ce qu'une société béninoise peut encaisser hors zone XOF, et comment les fonds lui sont reversés, est la principale inconnue ([D-09]).
- Le pays du numéro de téléphone n'est pas le pays de paiement : l'utilisateur confirme son pays de paiement au moment de l'achat ([D-17]).

## 3. Modèle économique : TVOD

- Pas d'abonnement mensuel au lancement.
- L'utilisateur achète :
  - **un épisode** — prix indicatif **300 FCFA** ;
  - **un pass saison** — prix indicatif **1 500 FCFA**.
- Les prix sont **configurables par un administrateur** (jamais codés en dur).
- Un pass saison débloque **tous les épisodes publiés de la saison, y compris ceux ajoutés plus tard**.
- Les achats **n'expirent pas**.
- Les achats sont regroupés dans une **bibliothèque personnelle**.
- Certains épisodes sont **gratuits** (visionnables sans compte).

### Lecture critique du modèle

1. **Micro-paiements et friction** : un paiement Mobile Money de 300 FCFA demande à l'utilisateur de valider une transaction sur son téléphone (USSD/OTP). Répéter cette étape à chaque épisode est pénible. Le pass saison est donc le produit à mettre en avant. Un système de **crédits / portefeuille prépayé** pourrait réduire la friction, mais il ajoute de la complexité (comptabilité, réglementation sur la monnaie électronique) : **reporté après la V1**.
2. **Frais des prestataires** : les commissions Mobile Money observées publiquement varient d'environ **1,8 % à 4 %** selon le pays et l'opérateur (à confirmer, voir TECHNICAL_ARCHITECTURE §5). Sur 300 FCFA, cela reste acceptable, mais il faut vérifier l'absence de **frais fixes** par transaction, qui rendraient les petits montants non rentables.
3. **Pass saison et épisodes futurs** : la promesse est forte. Il faut définir clairement ce qu'est une « saison » (nombre d'épisodes prévu) pour éviter qu'une saison s'allonge indéfiniment. Voir [DÉCISION D-08].
4. **Achat d'un pass après des épisodes à l'unité** : faut-il déduire les épisodes déjà achetés ? Recommandation V1 : **non** (simple), mais avertir l'utilisateur avant l'achat. Voir [DÉCISION D-08].

## 4. Catalogue de lancement

- **6 séries** : **1 disponible**, **5 « bientôt disponibles »**.
- Les séries « bientôt disponibles » ont une fiche (affiche, synopsis) mais aucun épisode jouable.
- **[HYPOTHÈSE H-01]** : format vidéo et durée des épisodes inconnus. Si les séries sont des **micro-dramas verticaux (9:16)** de 1 à 3 minutes, cela change fortement le lecteur, la mise en page et le coût par épisode. Voir [DÉCISION D-07].

## 5. Utilisateurs

| Profil | Besoin principal |
|---|---|
| Visiteur anonyme | Découvrir le catalogue, regarder les épisodes gratuits sans s'inscrire |
| Client | Acheter vite sur mobile, retrouver ses achats, regarder sans coupure |
| Administrateur | Gérer le contenu, les prix, voir les ventes et les paiements |

Contexte d'usage supposé **[HYPOTHÈSE H-02]** : majorité de smartphones Android d'entrée/milieu de gamme, connexion 3G/4G variable, forfaits data coûteux. Conséquence : poids des pages réduit, vidéo adaptative avec qualités basses disponibles.

## 6. Principes directeurs

1. **Une V1 réaliste** : uniquement les 13 fonctions essentielles (voir PRODUCT_REQUIREMENTS).
2. **La sécurité avant la vitesse** sur trois sujets non négociables : paiements, droits d'accès, comptes.
3. **Aucune confiance dans le navigateur** pour le paiement ou l'accès aux vidéos payantes.
4. **Simplicité de maintenance** : un fondateur non développeur doit pouvoir faire vivre la plateforme via l'interface d'administration, sans terminal.
5. **Coûts maîtrisés** : services managés à la consommation, pas d'infrastructure à administrer.

## 7. Ce qui n'est PAS dans la V1

Abonnement mensuel, application mobile native, téléchargement hors-ligne, portefeuille/crédits, codes promo, parrainage, commentaires/notes, recommandations personnalisées, multi-profils, multilingue (hors français), DRM complet, Chromecast/TV, notifications push. Détail dans PRODUCT_REQUIREMENTS §10.

## 8. Registre des décisions en attente

Ce registre est la **source unique** des décisions à valider. Les autres documents y renvoient.

| ID | Sujet | Recommandation | Statut |
|---|---|---|---|
| D-01 | Prestataires de paiement | **CinetPay + FedaPay**, derrière une architecture où chaque prestataire est interchangeable et désactivable (TECHNICAL_ARCHITECTURE §5.6) | **Validé** par le fondateur ; ouverture effective de chaque pays conditionnée aux réponses écrites (D-09, D-20) |
| D-02 | Pays ouverts | **Panafricain**, activation progressive : consultation partout, achat pays par pays et moyen par moyen dès confirmation A/B/C | **Validé** par le fondateur |
| D-03 | Grilles tarifaires | XOF : 300 / 1 500. XAF : 300 / 1 500 (parité). RDC : USD (recommandé, plus stable) ou CDF, montant à définir. Guinée : montant en GNF à définir. Une grille par devise au départ ; grilles par pays possibles plus tard sans changer le code | En attente |
| D-04 | Longueur du PIN | PIN **4 chiffres accepté** à condition d'appliquer toutes les protections de SECURITY_REQUIREMENTS §3 ; 6 chiffres en option si le fondateur le souhaite | En attente |
| D-05 | Vérification du numéro par SMS (OTP) | **Obligatoire** à l'inscription et pour réinitialiser le PIN | En attente |
| D-06 | Authentification des administrateurs | E-mail + mot de passe fort + **double authentification (TOTP)** obligatoire, séparée du PIN client (les admins auront donc besoin d'une adresse e-mail et d'une application d'authentification sur leur téléphone) | En attente |
| D-07 | Format vidéo (vertical 9:16 ou horizontal 16:9) et durée moyenne | Information à fournir par le fondateur | En attente |
| D-08 | Politiques commerciales et éditoriales : remboursement, retrait d'un contenu acheté, pass après épisodes, taille d'une saison, classification d'âge | Voir PRODUCT_REQUIREMENTS §8 | En attente |
| D-09 | Stratégie d'encaissement par zone monétaire | Société **béninoise** (fait communiqué par le fondateur). Reste à décider, selon les réponses des prestataires et d'un juriste, comment encaisser hors zone XOF : compte de la société béninoise si accepté, sinon partenaire local, entité locale ou prestataire supplémentaire. Voir TECHNICAL_ARCHITECTURE §5.10 | En attente des réponses écrites — **bloquant** pour l'achat dans les pays concernés |
| D-10 | Mention « contenu créé avec l'IA » | Recommandé : mention discrète sur la fiche série | En attente |
| D-11 | Nom de domaine | À fournir | En attente |
| D-12 | Budget mensuel d'infrastructure | Estimation indicative dans TECHNICAL_ARCHITECTURE §10 | En attente |
| D-13 | Lecteur vidéo V1 | **Lecteur intégré Bunny** (iframe) personnalisé aux couleurs ; lecteur sur mesure plus tard | En attente |
| D-14 | Identité de marque (logo, couleurs officielles) | En attendant : logotype texte provisoire, aucune identité définitive inventée | En attente |
| D-15 | Langue | Français uniquement en V1 | En attente |
| D-16 | Prestataire SMS | À choisir après comparaison des tarifs **pour tous les pays visés** (la couverture SMS doit suivre la couverture paiement) | En attente |
| D-17 | Choix du pays de paiement | L'utilisateur **confirme** son pays de paiement au premier achat (suggestion : pays choisi pour l'affichage, puis IP, puis indicatif), mémorisé ensuite ; le numéro n'est jamais considéré comme le pays de résidence ou de facturation. Parcours : TECHNICAL_ARCHITECTURE §5.7 | **Principe validé** par le fondateur ; validation des écrans à faire |
| D-18 | Prestataire principal en zone UEMOA (où les deux se recouvrent) | Choisir par pays selon les **frais réels négociés** ; l'autre sert de secours automatique | En attente des grilles tarifaires |
| D-19 | Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale, Guinée-Bissau | **Aucune information trouvée, pas d'exclusion** : questions écrites aux deux prestataires ; consultation ouverte en attendant ; 3ᵉ prestataire à étudier seulement si les deux répondent non | En attente des réponses |
| D-20 | Envoi des questions écrites aux prestataires | Envoyer [docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md) à CinetPay et FedaPay (par e-mail, pour garder une trace écrite) ; consigner les réponses dans ce même document | **Action du fondateur** |
| D-21 | Pays affiché par défaut aux visiteurs dont le pays est inconnu ou non ouvert | Bénin (grille XOF), avec la mention « prix indicatif » | En attente |
| D-22 | Comptes testeurs pour le statut `pilot` | Liste de numéros fournie par le fondateur pour tester les achats réels avant ouverture publique d'un pays | En attente |

## 9. Index des documents

| Document | Contenu |
|---|---|
| [PRODUCT_REQUIREMENTS.md](PRODUCT_REQUIREMENTS.md) | Exigences fonctionnelles détaillées |
| [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) | Choix technologiques et architecture |
| [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) | Modèle de données |
| [DESIGN_GUIDELINES.md](DESIGN_GUIDELINES.md) | Système visuel |
| [SECURITY_REQUIREMENTS.md](SECURITY_REQUIREMENTS.md) | Règles de sécurité et menaces |
| [DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md) | Phases de développement |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Prérequis de lancement et dépendances externes |
| [CLAUDE.md](CLAUDE.md) | Règles de développement pour l'agent |
