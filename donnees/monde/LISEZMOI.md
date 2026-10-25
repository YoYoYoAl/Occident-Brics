# Tous les pays de l'ONU (extension des 50 pays)

194 pays : les 50 pays du jeu (inchangés, en tête de liste) et les 144 autres membres de l'ONU (`outils/pays_monde.json`).

| Fichier | Contenu | Remplace (branche v0.3) |
|---|---|---|
| `pays2000.json` | 8 indicateurs OWID 2000, `idCarte`, nom français | `src/data/pays2000.json` |
| `attributs2000.json` | 78 indicateurs sourcés (dont les 73 des 30 attributs) | `src/data/attributs2000.json` |
| `scores2000.json` | scores 0-100 des 30 attributs | `src/data/scores2000.json` |
| `trajectoires.json` | PIB, population, CO2 2000-2022 (OWID), plus `estimations` | `src/data/trajectoires.json` |
| `influence2000_monde.ts` (+ `.json`) | influence de départ des 144 pays, `INFLUENCE_2000_MONDE` | à fusionner avec `INFLUENCE_2000` |
| `complements2000.json` | OTAN, UE, OPEP, ASEAN, CEI, alliés, sanctions, régimes, aléas, indépendances | à fusionner avec `geographie.ts` et `organisations.ts` |

## Régénérer

```
python3 -I outils/construire_donnees.py <owid-co2-data.csv> <owid-energy-data.csv> outils/iso_numerique.json > donnees/monde/pays2000.json
python3 -I outils/construire_trajectoires.py <owid-co2-data.csv> donnees/monde/pays2000.json > donnees/monde/trajectoires.json
python3 -I outils/completer_estimations.py donnees/monde/pays2000.json donnees/monde/trajectoires.json <bm_NY.GDP.MKTP.PP.KD.json> <bm_NY.GDP.MKTP.KD.json>
python3 -I outils/collecter_attributs.py <cache> > donnees/monde/attributs2000.json
python3 -I outils/scores_attributs.py donnees/monde/attributs2000.json > donnees/monde/scores2000.json
python3 -I outils/estimer_monde.py donnees/monde
```
Les deux fichiers Banque mondiale : `https://api.worldbank.org/v2/country/all/indicator/<code>?format=json&per_page=20000&date=2000:2022&source=2`.

## Ce qui est estimé (marqué « estimation »)

- **Scores** : même échelle que les 50 pays (100 = le plus fort des 50 de la v0.2), les autres pays ramenés dans 0-100.
  Les 50 pays gardent exactement leurs scores. Données manquantes : valeurs par défaut (pas de production, pas d'armée)
  ou corrections pays par pays avec leur raison (`AJUSTEMENTS_MONDE`, `GINI_ESTIME` dans `outils/scores_attributs.py`).
- **Naval, aérien, cyber** : indices estimés (`ESTIMATIONS_MILITAIRES`, `RANGS_CYBER`).
- **Religions** de 11 micro-États absents du tableau Pew (`RELIGIONS_HORS_PEW`).
- **PIB** de 32 pays absents de Maddison (micro-États, îles, Soudan, Somalie…) : série Banque mondiale ramenée à l'échelle
  Maddison ; **CO2** de Monaco et Saint-Marin (comptés avec la France et l'Italie). Liste dans `trajectoires.json > estimations`.
- **Influence 2000** : profils régionaux calés sur les 50 pays, puis corrections ; les 26 pays qui reconnaissent Taïwan
  en 2000 ont une influence politique chinoise de 3 au plus.

## Points d'attention pour l'intégration

- Tuvalu n'existe pas sur la carte Natural Earth 1:50m : il faut un point ou le laisser hors carte.
- Timor oriental (2002), Monténégro (2006) et Soudan du Sud (2011) ne sont pas indépendants en 2000 (`complements2000.json > rattachement2000`) :
  leurs données sont celles du territoire.
- Les tests v0.1 et v0.2 vérifient « 50 pays » : à adapter. Les nouveaux tests : `tests/acceptation-monde.test.ts`.
- Plus de pays pèsent dans le score : l'équilibre IA contre IA (KOMI) est à recalibrer.
