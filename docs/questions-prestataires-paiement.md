# Questions écrites à CinetPay et FedaPay

> Objet : confirmer par écrit, avant toute ouverture d'un pays à l'achat, ce qu'une **société immatriculée au Bénin** peut faire chez chaque prestataire.
> Envoi recommandé **par e-mail** (trace écrite), depuis l'adresse de la société, au service commercial **et** au service conformité de chaque prestataire. Décision **D-20** (PROJECT_BRIEF §8).
> Les groupes de questions sont numérotés Q-I à Q-VIII pour ne pas les confondre avec les confirmations **A** (disponibilité technique), **B** (accès pour la société béninoise) et **C** (reversement) de TECHNICAL_ARCHITECTURE §5.1.
> Les réponses sont consignées au §4 de ce document, puis reportées dans TECHNICAL_ARCHITECTURE §5.2 à §5.4 (passage des symboles 🟢/🟡/⚪ à ✅ ou ❌) et dans l'admin (état des confirmations par pays).

Pays concernés par les questions (liste à ajuster) :
- **UEMOA (XOF)** : Bénin, Côte d'Ivoire, Sénégal, Togo, Burkina Faso, Mali, Niger, Guinée-Bissau
- **Guinée (GNF)**
- **CEMAC (XAF)** : Cameroun, Gabon, Congo, Tchad, Centrafrique, Guinée équatoriale
- **RD Congo (CDF / USD)**

---

## 1. Message d'introduction (commun, à adapter)

> Bonjour,
>
> Nous sommes [nom de la société], société immatriculée au Bénin (RCCM n° [à compléter]). Nous préparons le lancement d'Agodjié TV, une plateforme de vidéo à la demande (achat d'épisodes ou d'une série complète, montants unitaires d'environ 300 à 1 500 FCFA), destinée aux utilisateurs d'Afrique de l'Ouest et d'Afrique centrale.
>
> Nous souhaitons intégrer [CinetPay / FedaPay] via votre API (page de paiement hébergée, notifications serveur, vérification de transaction). Avant de finaliser notre architecture, pourriez-vous nous confirmer **par écrit** les points ci-dessous ? Pour chaque pays, une réponse sous forme de tableau nous serait très utile.
>
> Merci d'avance,
> [Nom, fonction, téléphone]

---

## 2. Questions communes aux deux prestataires

### Q-I. Éligibilité de notre société béninoise
1. Une société immatriculée au Bénin peut-elle ouvrir un compte marchand chez vous ? Pour quels types d'activité (vente de contenus numériques / vidéo à la demande) ?
2. Quelle est la liste exacte des documents KYC/KYB demandés pour une société béninoise ? Délai habituel de validation ?
3. Notre activité (vente de séries, dont certaines produites avec l'intelligence artificielle) fait-elle l'objet de restrictions ou de vérifications particulières ?
4. Existe-t-il des frais d'ouverture, d'abonnement, de maintenance ou un minimum de volume mensuel ?

### Q-II. Pays où notre compte peut encaisser
5. Avec un compte ouvert par notre société béninoise, **dans quels pays** pouvons-nous encaisser des paiements de clients ? Merci de répondre pays par pays pour la liste ci-dessus (oui / non / sous conditions).
6. Faut-il **un compte marchand distinct par pays ou par devise** ? Si oui, peut-il être ouvert par notre société béninoise, ou faut-il une entité, un représentant ou un compte bancaire dans le pays concerné ?
7. Pour chaque pays : quels **opérateurs Mobile Money** et quels **portefeuilles** (Wave, etc.) sont actifs aujourd'hui ? Y a-t-il des opérateurs prévus prochainement ?
8. **Cartes bancaires** : acceptées dans quels pays ? Visa et Mastercard ? Cartes émises hors d'Afrique acceptées ? 3-D Secure obligatoire ?
9. Un client peut-il payer avec un moyen de paiement d'un pays différent de celui que nous indiquons dans la transaction (ex. client au Togo payant avec un compte Mobile Money béninois) ?

### Q-III. Devises
10. Dans quelles **devises** pouvons-nous créer des transactions avec notre compte : XOF, XAF, GNF, CDF, USD ?
11. Si un client paie dans une devise différente de celle de notre compte, y a-t-il **conversion** ? Par qui, à quel taux, avec quels frais ?
12. Contraintes de montant par devise : minimum, maximum, **multiple obligatoire** (ex. multiple de 5) ?

### Q-IV. Frais
13. Grille **actuelle et complète** des frais d'encaissement par pays, opérateur et carte (pourcentage et éventuels **frais fixes** par transaction).
14. Ces frais sont-ils négociables selon le volume ? À partir de quel volume ?
15. Frais facturés en cas d'échec, d'annulation ou de remboursement ?
16. Les frais sont-ils hors taxes ? Quelle TVA s'applique ?

### Q-V. Reversements à notre société
17. Les fonds encaissés dans **chaque pays** peuvent-ils être reversés à notre société béninoise ? Sur un compte bancaire au Bénin ? Sur un compte Mobile Money béninois ?
18. Dans quelle **devise** sont reversés les fonds encaissés en XAF, GNF, CDF ou USD ? Taux et frais de conversion ?
19. **Délai** de reversement (en jours ouvrés) par pays et par moyen ; reversement automatique ou sur demande ; montant minimum ?
20. Frais de reversement (fixes et/ou en pourcentage) ?
21. Existe-t-il des contraintes réglementaires (change, rapatriement de fonds) pour les fonds encaissés hors zone UEMOA ? Les prenez-vous en charge ?

### Q-VI. Technique
22. Format exact des **notifications serveur** (webhooks) : méthode, champs, mécanisme d'authentification (signature, HMAC, secret par compte), nombre et rythme des relances.
23. API de **vérification de transaction** : champs retournés (statut, montant, devise, pays, opérateur), liste exhaustive des statuts.
24. Peut-on **présélectionner** sur la page de paiement : la famille de moyen (Mobile Money / carte), l'opérateur, le pays ? Peut-on **restreindre** les pays ou opérateurs proposés ?
25. Un client peut-il réessayer sur la même transaction après un premier échec ? Comment le statut évolue-t-il ?
26. Environnement **sandbox** : disponible pour quels pays et moyens ? Numéros et cartes de test ?
27. Disponibilité : existe-t-il une page d'état / d'incidents, et des engagements de disponibilité ?
28. Limites de débit de l'API ?

### Q-VII. Remboursements et litiges
29. Les remboursements sont-ils possibles **par API** ? Pour quels moyens (Mobile Money, carte) et dans quels pays ? Délais ?
30. Procédure en cas de contestation d'un client ou de rétrofacturation (carte) ?

### Q-VIII. Conformité
31. Quelles obligations nous incombent (conditions générales, mentions légales, politique de remboursement affichée) ?
32. Êtes-vous agréé ou partenaire d'établissements agréés dans chacun des pays listés ? Lesquels ?

---

## 3. Questions spécifiques

### CinetPay
- C1. Votre FAQ indique qu'un marchand doit être « une entreprise établie dans le pays depuis lequel il veut encaisser ». Concrètement, notre société béninoise peut-elle encaisser au **Cameroun**, en **RD Congo**, en **Guinée** et dans les autres pays CEMAC ?
- C2. Votre documentation mentionne qu'un compte « créé au Cameroun » ne peut initier des paiements qu'en XAF. Un compte créé au Bénin est-il limité au **XOF** ? Peut-on disposer de plusieurs comptes (un par devise) au nom de la même société béninoise ?
- C3. Couvrez-vous aujourd'hui le **Gabon**, le **Congo-Brazzaville**, le **Tchad**, la **Centrafrique**, la **Guinée équatoriale**, le **Niger** et la **Guinée-Bissau** ? Avec quels opérateurs ?
- C4. Vos CGU mentionnent l'ouverture d'un compte bancaire dans tout pays hors UEMOA : est-ce obligatoire pour recevoir les fonds encaissés en XAF, CDF ou GNF ?
- C5. Le paramètre `channels` permet de choisir la famille de moyen ; existe-t-il un moyen de présélectionner le **pays** ou l'**opérateur** ?

### FedaPay
- F1. Votre centre d'assistance mentionne la **Guinée** parmi les pays supportés. Pouvez-vous confirmer : opérateurs disponibles (MTN, Orange ?), devise d'encaissement (**GNF** ou XOF ?) et reversement à une société béninoise ?
- F2. Votre documentation indique que seul le XOF est actuellement pris en charge pour les transactions, tout en listant le GNF. Quelles devises sont **réellement** disponibles aujourd'hui ? Une prise en charge de **XAF**, **CDF** ou **USD** est-elle prévue, et à quelle échéance ?
- F3. Couvrez-vous ou prévoyez-vous de couvrir le **Cameroun**, la **RD Congo** et les autres pays CEMAC ?
- F4. **Burkina Faso**, **Mali** et **Guinée-Bissau** : disponibles aujourd'hui ? Avec quels opérateurs ?
- F5. La présélection de l'opérateur via l'API est-elle toujours limitée à MTN ? Est-elle prévue pour d'autres opérateurs ?
- F6. Le reversement vers Mobile Money est-il activé sur demande ? Délais de reversement vers un compte bancaire béninois ?

---

## 4. Suivi des réponses

| Date d'envoi | Prestataire | Interlocuteur | Date de réponse | Lien vers la réponse | Commentaire |
|---|---|---|---|---|---|
| | CinetPay | | | | |
| | FedaPay | | | | |

### Tableau de synthèse par pays (à remplir avec les réponses)

Légende : ✅ confirmé par écrit · ❌ refusé par écrit · ⏳ en attente · ⚠️ sous conditions (préciser)

| Pays | Devise | A — Technique CinetPay | A — Technique FedaPay | B — Société béninoise CinetPay | B — Société béninoise FedaPay | C — Reversement CinetPay | C — Reversement FedaPay | Frais Mobile Money | Délai de reversement |
|---|---|---|---|---|---|---|---|---|---|
| Bénin | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Côte d'Ivoire | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Sénégal | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Togo | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Burkina Faso | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Mali | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Niger | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Guinée-Bissau | XOF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Guinée | GNF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Cameroun | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Gabon | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Congo | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Tchad | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Centrafrique | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| Guinée équatoriale | XAF | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
| RD Congo | CDF / USD | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | ⏳ | | |
