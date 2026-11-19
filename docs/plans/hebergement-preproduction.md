# Hébergement et budget de la préproduction — comparaison et recommandation

Statut : **proposé, en attente de validation du fondateur**. Aucun compte créé, aucune configuration modifiée, aucune dépense.
Niveau de preuve : 🟡 pages officielles lues via moteur de recherche (sources en fin de document) — **à vérifier sur la page d'inscription** de chaque service le jour de la création du compte.

## 1. Préproduction ≠ production

| | Préproduction (maintenant) | Production commerciale (plus tard, au pilote) |
|---|---|---|
| Public | Vous et quelques testeurs | Clients réels |
| Disponibilité | Une mise en veille est acceptable | Toujours en ligne |
| Sauvegardes, support | Non nécessaires | Indispensables |
| Budget | Viser **0 $** | À décider avec le trafic réel |

## 2. Hébergement du site (Next.js)

| Solution | Usage commercial | Coût | Limites et contraintes | Compatibilité avec notre code |
|---|---|---|---|---|
| **Vercel Hobby** | ❌ Réservé à l'usage personnel / non commercial | 0 $ | — | Parfaite, mais **non conforme** pour Agodjié TV |
| **Vercel Pro** | ✅ | 20 $/mois par membre | Aucune contrainte gênante | Parfaite (éditeur de Next.js) |
| **Netlify Free** | ✅ Autorisé selon Netlify | **0 $**, sans carte | 300 crédits/mois **plafonnés** (jamais de facture surprise : au-delà, le site est mis en pause jusqu'au mois suivant). Un déploiement « production » coûte 15 crédits ; les déploiements de prévisualisation et de branche sont indiqués comme gratuits | Bonne : Next.js pris en charge par l'adaptateur officiel de Netlify ; à confirmer au premier déploiement |
| **Render Free** | ⚠️ Non confirmé (conditions non trouvées) | 0 $ | Mise en veille après 15 min sans visite, **≈ 1 min** pour se réveiller ; 750 h/mois | Excellente (même fonctionnement que nos tests) |
| Render Starter | ✅ | ≈ 7 $/mois | Toujours en ligne, région Francfort disponible | Excellente — candidat sérieux pour la **production** |
| Cloudflare Workers | ✅ | 0 $ (Free) / 5 $/mois | Free : 10 ms de calcul par requête et application limitée à 3 Mo compressés — **insuffisant** pour notre site | Moyenne (adaptations nécessaires) |
| Railway | ✅ | Essai 5 $ (30 jours), puis 5 $/mois | Abonnement dû même sans usage | Bonne |
| Fly.io | ✅ | Essai ≈ 1 $ / 7 jours, puis payant | Plus de niveau gratuit pour les nouveaux comptes | Bonne |

**Recommandation pour la préproduction : Netlify Free.** Usage commercial autorisé, 0 $, aucune carte bancaire, plafond strict (aucune dépense possible). Solution de repli : Render Free (si Netlify posait un problème technique), en acceptant le temps de réveil.
**Production** : décision reportée au pilote, avec le trafic réel (candidats : Render Starter ≈ 7 $/mois en région Francfort, Netlify Pro, Vercel Pro 20 $/mois).

Précautions prévues : préproduction **non indexée** par les moteurs de recherche, et protégée par un **code d'accès** simple que j'ajouterai (pour que seuls vous et vos testeurs y accèdent).

## 3. Bunny Stream (vidéo)
- **Essai** : **20 $ de crédit à l'inscription, sans carte bancaire** ; +30 $ si une carte est ajoutée (facultatif). L'essai dure **14 jours** ou jusqu'à épuisement du crédit ; le crédit restant est retiré à la fin de l'essai.
- **Après l'essai** : solde prépayé obligatoire (« Add funds » : le plus petit montant proposé est **10 $**, montant libre possible — plancher exact à confirmer) ; **minimum de facturation 1 $/mois** tant qu'une bibliothèque est active ; rechargement automatique facultatif.
- **Coût prévisible de nos premiers tests** (3 vidéos de 1 min 30 à 1 min 50, ≈ 200 visionnages de test) :
  - stockage ≈ 0,3 Go (toutes qualités + originaux) → **< 0,01 $/mois** ;
  - diffusion ≈ 200 × 20 Mo = 4 Go × 0,06 $ → **≈ 0,25 $** ;
  - encodage : **gratuit** ;
  - → couvert par le crédit d'essai ; ensuite **1 $/mois** (minimum). Un dépôt de 10 $ couvrirait environ **10 mois** de préproduction.
- Conseil : regrouper les tests réels dans les **14 jours** de l'essai.

## 4. Supabase (base de données)
L'offre **Free suffit** pour la préproduction : base 500 Mo (nous utilisons quelques Mo), 2 projets actifs, 50 000 utilisateurs actifs par mois, 5 Go de trafic sortant (non facturé au-delà : limité), aucune carte.
Limites qui imposeront l'offre payante (Pro ≈ 25 $/mois) **pour la production seulement** :
- mise en **veille après 7 jours** sans activité (données conservées, réactivation depuis le tableau de bord) ;
- **pas de sauvegardes automatiques** ;
- base au-delà de 500 Mo, besoin de plus de 2 projets.

## 5. Vidéos de test sans utiliser les épisodes définitifs
1. **Une vidéo technique générée par moi** (1 min 50, verticale, avec son, compteur à l'écran) : droits entièrement à nous ; sert aux tests d'expiration des liens, de pause prolongée et de reprise.
2. **Deux courtes vidéos tournées par vous au téléphone** (≈ 1 min 30, en vertical, avec son ; par exemple un décor, une rue, une conversation entre personnes consentantes) : droits à vous, et contenu réaliste pour mesurer les vrais débits et coûts.
3. Alternative : banques de vidéos libres de droits (licence à vérifier vidéo par vidéo).
Les épisodes définitifs ne seront utilisés qu'une fois la chaîne vidéo validée.

## 6. Synthèse budgétaire

| | Montant |
|---|---|
| Coût initial | **0 $** |
| Pendant les 14 jours d'essai Bunny | **0 $** |
| Coût mensuel minimal ensuite | **≈ 1 $/mois** (minimum Bunny) ; Netlify et Supabase : 0 $ |
| Avance à prévoir après l'essai | **≈ 10 $** de crédit Bunny (≈ 10 mois de préproduction) |
| Frais supplémentaires possibles | Aucun automatique (plafonds Netlify et Supabase) ; Bunny seulement si les tests dépassent largement l'usage prévu |
| Non nécessaires à ce stade | Vercel Pro, Supabase Pro, nom de domaine, Bunny DRM |

## Sources
- Vercel : https://vercel.com/pricing · https://vercel.com/legal/terms · https://vercel.com/docs/plans/hobby
- Netlify : https://www.netlify.com/pricing/ · https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/ · https://www.netlify.com/guides/netlify-vs-vercel/
- Render : https://render.com/docs/free · https://render.com/hosting/nodejs
- Cloudflare : https://developers.cloudflare.com/workers/platform/limits/ · https://developers.cloudflare.com/workers/platform/pricing/
- Railway : https://docs.railway.com/pricing/plans · Fly.io : https://docs.fly.io/about/pricing
- Bunny : https://bunny.net/blog/improving-our-free-trial-more-flexibility-and-a-better-experience/ · https://docs.bunny.net/billing/add-funds · https://bunny.net/faq/ · https://bunny.net/docs/stream/pricing
- Supabase : https://supabase.com/pricing · https://supabase.com/kb/faqs/platform/free-project-pausing · https://supabase.com/docs/guides/platform/manage-your-usage/egress
