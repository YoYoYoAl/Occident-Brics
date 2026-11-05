#!/bin/sh
# Copie les musiques utilisées par la maquette v2 dans dist-maquette/musiques (publiées avec la page).
# Ambiances v2 : menu, ere1 à ere3, tension, guerre, victoire, defaite (carte et calme ne sont pas utilisées).
# menu_4, menu_5, occident, chine et rencontre sont intégrés au HTML (src/v2/musiques), pas copiés ici.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist-maquette/musiques
for m in menu ere1 ere2 ere3 tension guerre victoire defaite; do
  if [ $m = menu ]; then cp public/musiques/menu.mp3 public/musiques/menu_[23].mp3 dist-maquette/musiques/; continue; fi
  cp public/musiques/$m.mp3 public/musiques/${m}_*.mp3 dist-maquette/musiques/
done
