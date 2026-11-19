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

## 8. Registre des décisions

Ce registre est la **source unique** des décisions à valider. Les autres documents y renvoient.

Colonne « Nécessaire avant » : moment où la décision devient réellement nécessaire. Le développement peut commencer sans attendre les autres (voir DEVELOPMENT_ROADMAP §1).

| ID | Sujet | Décision / recommandation | Statut | Nécessaire avant |
|---|---|---|---|---|
| D-01 | Prestataires de paiement | **CinetPay + FedaPay**, intégrations **modulaires** (un adaptateur par prestataire derrière une interface commune, activable/désactivable). Les réponses commerciales n'empêchent pas de construire le reste : un **simulateur de paiement** sert au développement et aux tests | **Validé** | — |
| D-02 | Pays | **Panafricain**, activation progressive : consultation partout, achat pays par pays et moyen par moyen dès confirmation A/B/C | **Validé** | — |
| D-03 | Grilles tarifaires | **XOF : 300 FCFA / épisode, 1 500 FCFA / saison** (prix indicatifs validés, modifiables dans l'admin). Autres monnaies (XAF, GNF, CDF/USD) : **grilles indépendantes**, montants à saisir le moment venu ; **aucune conversion automatique** | **Validé** pour XOF ; autres montants en attente | Ouverture d'un pays hors XOF |
| D-04 | Longueur du PIN | 4 chiffres avec toutes les protections de SECURITY_REQUIREMENTS §3 ; longueur **paramétrable** (4 ou 6) | Recommandation par défaut : 4 | Étape 3 (modifiable ensuite) |
| D-05 | Vérification du numéro par SMS (OTP) | Obligatoire à l'inscription et pour réinitialiser le PIN | Recommandation par défaut | Étape 3 |
| D-06 | Authentification des administrateurs | E-mail + mot de passe fort + double authentification (TOTP) obligatoire | À confirmer | **Étape 4** |
| D-07 | Format vidéo et durée moyenne | Le format est un **réglage par série** (vertical 9:16 ou horizontal 16:9) : l'interface s'adapte, rien n'est figé. Merci d'indiquer le format de la première série et une durée moyenne | Information attendue | Étape 2 (maquettes) — non bloquant |
| D-08 | Politiques commerciales et éditoriales | Comportements techniques par défaut déjà définis (RM-06 à RM-10) ; textes définitifs (remboursement, retrait de contenu, classification d'âge) à valider | En attente | Pilote |
| D-09 | Stratégie d'encaissement par zone monétaire | Société **béninoise**. Hors zone XOF : selon les réponses des prestataires et d'un juriste | En attente des réponses écrites | Ouverture à l'achat des pays concernés |
| D-10 | Mention « contenu créé avec l'IA » | Mention discrète sur la fiche série (champ déjà prévu) | En attente | Pilote |
| D-11 | Nom de domaine | À fournir | En attente | Pilote |
| D-12 | Budget mensuel d'infrastructure | Estimation indicative dans TECHNICAL_ARCHITECTURE §10 | En attente | Création des comptes payants |
| D-13 | Lecteur vidéo V1 | Lecteur intégré Bunny (derrière une interface `VideoProvider`, remplaçable) | Recommandation par défaut | Étape 6 |
| D-14 | Identité de marque | Logotype texte provisoire ; logo officiel intégré dès réception | En attente | Lancement public |
| D-15 | Langue | Français en V1, textes centralisés | Recommandation par défaut | — |
| D-16 | Prestataire SMS | Interface `SmsProvider` ; simulateur en développement ; prestataire réel choisi sur comparaison des tarifs par pays | En attente | Pilote (tests réels dès l'étape 8) |
| D-17 | Choix du pays de paiement | Pays **confirmé par l'utilisateur** au premier achat, mémorisé ; l'indicatif et l'IP ne sont que des suggestions | **Principe validé** ; écrans à valider | Étape 5 |
| D-18 | Prestataire principal par pays en zone XOF | Selon les frais réels ; l'autre en secours | En attente des grilles tarifaires | Pilote |
| D-19 | Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale, Guinée-Bissau | Pas d'exclusion ; questions écrites ; consultation ouverte en attendant | En attente des réponses | Ouverture de ces pays |
| D-20 | Questions écrites aux prestataires | Envoyer [docs/questions-prestataires-paiement.md](docs/questions-prestataires-paiement.md) | **Action du fondateur** (à lancer maintenant : délais de réponse) | Pilote |
| D-21 | Pays affiché par défaut | **Bénin** (grille XOF) pour les visiteurs dont le pays est inconnu, avec la mention claire « Prix indicatifs — modifiables selon votre pays » | **Validé** | — |
| D-22 | Programme pilote | **Petit groupe de testeurs répartis dans plusieurs pays**, achats réels en statut `pilot` ; la composition du groupe **ne bloque pas** le développement | **Principe validé** ; liste des testeurs à fournir | Étape 10 (pilote) |

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
