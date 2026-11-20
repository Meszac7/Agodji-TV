#!/usr/bin/env bash
# Netlify — commande « ignore » : décide si une modification du dépôt doit être mise en ligne.
#   sortie 0 = NE PAS déployer (économise les crédits de l'offre gratuite)
#   sortie 1 = déployer
# On déploie UNIQUEMENT :
#   - si le dernier commit contient la mention [deploy:preprod] ;
#   - ou si le déploiement est demandé par un « lien de déclenchement » Netlify (build hook).
# Toute autre situation (y compris une erreur de lecture) : pas de déploiement.
set -u

if [ -n "${INCOMING_HOOK_TITLE:-}" ]; then
  echo "Déploiement demandé par le lien de déclenchement « ${INCOMING_HOOK_TITLE} »."
  exit 1
fi

message="$(git log -1 --pretty=%B "${COMMIT_REF:-HEAD}" 2>/dev/null || true)"
if printf '%s' "$message" | grep -qF '[deploy:preprod]'; then
  echo "Déploiement demandé par le commit (mention [deploy:preprod])."
  exit 1
fi

echo "Mise en ligne automatique ignorée : aucune demande explicite ([deploy:preprod] ou lien de déclenchement)."
exit 0
