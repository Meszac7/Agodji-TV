# Décision — Limites de format strictes et politique tarifaire

Date : 2026-11-22 · Origine : décisions définitives du fondateur · Statut : **validé par le fondateur**.
Complète `2026-11-21-series-sans-saisons-pass-serie.md` (séries sans saisons, Pass série) et **remplace** sa règle « avertissement » (D-28) et ses prix indicatifs (D-03).

## 1. Limites de format : blocage strict, sans contournement

| Règle | Limite | Conséquence |
|---|---|---|
| Épisodes par série | **10 maximum** | Publication bloquée au-delà |
| Durée d'un épisode | **1 min 50 (110 s) maximum** (cible 1 min 30) | Publication bloquée si un épisode dépasse |
| Durée totale de la série | **15 min (900 s) maximum** | Publication bloquée si le total dépasse |

- **Calcul sur tous les épisodes de la série** : publiés, programmés, brouillons et dépubliés.
- **Aucun bouton de contournement** dans l'administration. Le blocage est appliqué **par la base de données elle-même** (règle vérifiée à chaque enregistrement), pas seulement par l'interface.
- **Ce qui est bloqué exactement** : dès qu'une série a au moins un épisode publié ou programmé, elle doit **en permanence** respecter les trois limites. Toute modification qui la ferait sortir des limites est refusée : publier ou programmer un épisode, ajouter un 11ᵉ épisode, allonger une durée. Un épisode ne peut pas être publié ou programmé **sans durée renseignée**.
- **Brouillons d'une série encore non publiée** : ils restent modifiables librement (travail en cours), mais la série ne pourra rien publier tant qu'elle dépasse.
- **Brouillon sans durée** (vidéo pas encore téléversée) : compté comme « durée manquante » et signalé dans l'administration ; il devra avoir une durée avant d'être publié.
- **Affichage admin** : pour chaque série, nombre d'épisodes / 10, durée totale / 15 min, durée de chaque épisode avec repère 1 min 30 et limite 1 min 50, dépassements surlignés en rouge, et motif précis du blocage.
- **Valeurs des limites** : stockées en base, **modifiables uniquement par une évolution versionnée du code** (migration revue), jamais depuis l'administration.

## 2. Politique tarifaire

| Achat | Prix | Accès |
|---|---|---|
| **Épisode à l'unité** | **499 FCFA** (tarif de référence, XOF) | Cet épisode uniquement, sans expiration |
| **Pass série** | **Prix propre à chaque série**, librement fixé par l'administrateur (aucun prix unique imposé) | Tous les épisodes de la série, y compris ceux publiés plus tard, sans expiration |

- Dans l'administration, on définit et modifie **indépendamment** :
  - le prix de **chaque épisode** (499 FCFA proposé par défaut, modifiable épisode par épisode) ;
  - le prix du **Pass de chaque série** ;
  - ces prix **pour chaque grille tarifaire** (pays / devise) : XOF, XAF, GNF, CDF/USD…
- **Aucune conversion automatique** entre monnaies : chaque prix est saisi explicitement dans sa devise.
- **Page série** : les deux possibilités d'achat sont affichées clairement, avec **l'économie réalisée avec le Pass** lorsqu'elle est positive (prix cumulé des épisodes payants publiés non encore achetés − prix du Pass), et la mention « + les prochains épisodes ».

## 3. Point de vigilance signalé au fondateur : 499 FCFA et CinetPay
La documentation de CinetPay indique que les montants en XOF/XAF doivent être des **multiples de 5** (🟢 source officielle, **à reconfirmer** par écrit et en sandbox). **499 n'est pas un multiple de 5.** Si cela se confirme, un paiement de 499 FCFA serait refusé par CinetPay. Options :
1. ajuster à **495 ou 500 FCFA** dans les pays servis par CinetPay (les prix sont par grille : possible sans changer le code) ;
2. servir ces pays par FedaPay (aucune contrainte de ce type trouvée à ce jour — **à vérifier**) ;
3. obtenir une confirmation écrite contraire de CinetPay (question déjà prévue dans `docs/questions-prestataires-paiement.md`, Q-III.12).

Le système refuse déjà, à la saisie, un prix incompatible avec les contraintes du compte de paiement utilisé dans le pays : aucun client ne pourra tomber sur un paiement impossible.
