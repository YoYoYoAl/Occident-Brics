#!/bin/sh
# Copie les musiques utilisées par la maquette v2 dans dist-maquette/musiques (publiées avec la page).
# Ambiances v2 : menu, ere1 à ere3, tension, guerre, victoire, defaite (carte et calme ne sont pas utilisées).
set -e
cd "$(dirname "$0")/.."
mkdir -p dist-maquette/musiques
for m in menu ere1 ere2 ere3 tension guerre victoire defaite; do
  cp public/musiques/$m.mp3 public/musiques/${m}_*.mp3 dist-maquette/musiques/
done
