"""Calcule les scores 0-100 des 30 attributs pour les 50 pays en 2000 (v0.2).

Usage : python3 -I outils/scores_attributs.py > src/data/scores2000.json
Entrée : src/data/attributs2000.json (données réelles et estimations sourcées).

Principe demandé par l'utilisateur (25/10/2026) : « le but est d'être réaliste, pas forcément factuel ».
Chaque score part d'une formule sur les données de 2000 (normalisation sur les 50 pays), puis les cas où la
formule donne un classement irréaliste, ou où la donnée manque, sont corrigés à la main dans AJUSTEMENTS,
avec leur raison. Tous les scores sont des estimations : 100 = le plus fort des 50 pays, 0 = le plus faible.
"""
import json, math, os, sys

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = json.load(open(os.path.join(RACINE, "src", "data", "attributs2000.json"), encoding="utf-8"))
PAYS = list(D["pays"])


def val(iso, cle):
    v = D["pays"][iso]["valeurs"].get(cle)
    return v["v"] if v else None


def norme(cle_ou_serie, log=False, inverse=False, bornes=None):
    """Série normalisée 0-1 sur les 50 pays (min-max), en log si demandé ; pays sans valeur absents."""
    s = cle_ou_serie if isinstance(cle_ou_serie, dict) else {i: val(i, cle_ou_serie) for i in PAYS}
    s = {i: x for i, x in s.items() if x is not None and (not log or x > 0)}
    if log:
        s = {i: math.log10(x) for i, x in s.items()}
    lo, hi = bornes if bornes else (min(s.values()), max(s.values()))
    r = {i: min(1.0, max(0.0, (x - lo) / (hi - lo))) for i, x in s.items()}
    return {i: 1 - x for i, x in r.items()} if inverse else r


def melange(*parts):
    """Moyenne pondérée de séries normalisées, pondération recalculée si une valeur manque."""
    sortie = {}
    for i in PAYS:
        dispo = [(p, s[i]) for p, s in parts if i in s]
        if dispo:
            sortie[i] = 100 * sum(p * x for p, x in dispo) / sum(p for p, _ in dispo)
    return sortie


def produit(a, b, facteur=1.0):
    return {i: val(i, a) * val(i, b) * facteur for i in PAYS if val(i, a) is not None and val(i, b) is not None}


def pct(cle):
    return {i: val(i, cle) for i in PAYS if val(i, cle) is not None}


wgi = {i: sum(val(i, k) for k in ("efficaciteGouv", "qualiteRegl", "controleCorruption", "etatDroit")) / 4
       for i in PAYS if val(i, "efficaciteGouv") is not None}
energie = {i: sum(val(i, k) or 0 for k in ("prodPetrole", "prodGaz", "prodCharbon")) for i in PAYS}
terres_rares = {i: 100 * math.sqrt(val(i, "terresRares") / 73000) for i in PAYS if val(i, "terresRares") is not None}

# Les 17 pays mégadivers (PNUE-WCMC), réduits aux 50 pays du jeu.
MEGADIVERS = {"AUS", "BRA", "CHN", "COL", "COD", "IND", "IDN", "MYS", "MEX", "PHL", "ZAF", "USA", "VEN"}

FORMULES = {  # attribut -> (famille, définition affichée, scores bruts)
    "Énergie": ("ressources", "Production de pétrole, gaz et charbon (log)", melange((1, norme(energie, log=True, bornes=(1, 4.1))))),
    "Agriculture": ("ressources", "Production de céréales et terres arables (log)",
                    melange((0.6, norme("prodCereales", log=True)), (0.4, norme("terresArables", log=True)))),
    "Métaux": ("ressources", "Rentes minérales en dollars (log)", melange((1, norme(produit("rentesMinerales", "pibNominal", 0.01), log=True, bornes=(7, 10.5))))),
    "Terres rares": ("ressources", "Production minière (racine de la part de la Chine)", terres_rares),
    "Autres": ("ressources", "Bois et autres ressources hors énergie et métaux : rentes forestières en dollars (log)",
               melange((1, norme(produit("rentesForestieres", "pibNominal", 0.01), log=True, bornes=(6, 10))))),
    "Effectif": ("population", "Population (log)", melange((1, norme("population", log=True)))),
    "Éducation": ("population", "Durée d'études, scolarisation secondaire et supérieure",
                  melange((0.5, norme("anneesEtudes")), (0.25, norme("scolSecondaire", bornes=(10, 110))), (0.25, norme("scolSuperieur", bornes=(0, 75))))),
    "Santé": ("population", "Espérance de vie et mortalité infantile (log)",
              melange((0.6, norme("esperanceVie")), (0.4, norme("mortaliteInfantile", log=True, inverse=True)))),
    "Fertilité": ("population", "Indice de fécondité (1 à 7 enfants par femme)", melange((1, norme("fecondite", bornes=(1, 7))))),
    "Culture": ("population", "Rayonnement : touristes accueillis et poids économique (log)",
                melange((0.5, norme("touristes", log=True)), (0.5, norme("pibNominal", log=True)))),
    "Religion": ("population", "Religiosité : part de la population affiliée à une religion",
                 {i: 100 - val(i, "sansReligion") for i in PAYS if val(i, "sansReligion") is not None}),
    "Urbanisation": ("population", "Part de la population urbaine", pct("urbanisation")),
    "Inégalités": ("population", "Égalité des revenus (100 = la plus égalitaire, indice de Gini 25 à 60)",
                   melange((1, norme("gini", inverse=True, bornes=(25, 60))))),
    "Commerce": ("economie", "Exportations (log) et ouverture commerciale",
                 melange((0.85, norme("exportations", log=True)), (0.15, norme("commercePib", bornes=(10, 150))))),
    "Gestion": ("economie", "Moyenne des indicateurs de gouvernance de la Banque mondiale (efficacité, réglementation, corruption, droit)",
                melange((1, norme(wgi, bornes=(-2, 2))))),
    "Puissance financière": ("economie", "PIB, réserves de change et capitalisation boursière (log)",
                             melange((0.5, norme("pibNominal", log=True)), (0.25, norme("reserves", log=True)), (0.25, norme("capitalisation", log=True)))),
    "Infrastructure": ("economie", "Électricité, Internet et téléphone",
                       melange((0.3, norme("accesElectricite")), (0.3, norme("electriciteParHab", log=True)), (0.2, norme("internet")), (0.2, norme("telFixe")))),
    "Naval": ("militaire", "Indice naval estimé (États-Unis = 100)", pct("indiceNaval")),
    "Aérien": ("militaire", "Indice aérien estimé (États-Unis = 100)", pct("indiceAerien")),
    "Terrestre": ("militaire", "Effectifs des armées et dépenses militaires (log)",
                  melange((0.5, norme("effectifsArmes", log=True)), (0.5, norme("depensesMil", log=True)))),
    "Spatial": ("militaire", "Objets lancés (log) et capacité de lancement autonome",
                melange((0.6, norme({i: (val(i, "objetsSpatiaux") or 0) + 1 for i in PAYS}, log=True)), (0.4, pct("lanceurOrbital")))),
    "Cyber": ("militaire", "Indice cyber estimé", pct("indiceCyber")),
    "Chimique": ("militaire", "Stock déclaré d'armes chimiques (log)",
                 {i: (100 * math.log10(1 + val(i, "stockChimique")) / math.log10(40001)) for i in PAYS if val(i, "stockChimique") is not None}),
    "Nucléaire": ("militaire", "Ogives nucléaires (log)", {i: 100 * math.log10(1 + val(i, "ogives")) / math.log10(12189) for i in PAYS}),
    "Terre": ("environnement", "Surface utile : terres agricoles et forêts (log)",
              melange((1, norme({i: val(i, "superficie") * (val(i, "terresAgricoles") + val(i, "forets")) / 100 for i in PAYS
                                 if None not in (val(i, "superficie"), val(i, "terresAgricoles"), val(i, "forets"))}, log=True)))),
    "Eau": ("environnement", "Eau renouvelable par habitant (log), accès à l'eau potable, faible stress",
            melange((0.5, norme("eauRenouvelable", log=True)), (0.3, norme("eauPotable", bornes=(20, 100))),
                    (0.2, norme("prelevementsEau", inverse=True, bornes=(0, 100))))),
    "Air": ("environnement", "Qualité de l'air : exposition aux particules fines (log, inversé)", melange((1, norme("pm25", log=True, inverse=True)))),
    "Climat": ("environnement", "Sobriété carbone : émissions de CO2 par habitant (log, inversé)", melange((1, norme("co2ParHab", log=True, inverse=True)))),
    "Biodiversité": ("environnement", "Richesse (pays mégadivers du PNUE-WCMC), indice Liste rouge et sites clés protégés",
                     melange((0.4, {i: 1.0 if i in MEGADIVERS else 0.3 for i in PAYS}), (0.35, norme("listeRouge")),
                             (0.25, norme("sitesProteges", bornes=(0, 100))))),
    "Forêt": ("environnement", "Part de forêt et surface forestière (log)",
              melange((0.6, norme("forets", bornes=(0, 70))), (0.4, norme("foretsKm2", log=True)))),
}

# Corrections de réalisme : attribut -> {pays: (score, raison)}. Complètent les données manquantes
# ou corrigent un classement que la formule rend irréaliste.
M = "donnée manquante, estimation"
AJUSTEMENTS = {
    "Énergie": {"ISR": (3, "presque aucune production"), "FRA": (45, "nucléaire non compté dans la formule"), "JPN": (35, "nucléaire non compté"), "KOR": (25, "nucléaire non compté"),
                "TWN": (10, "nucléaire non compté"), "PHL": (10, "géothermie non comptée"), "SGP": (0, "aucune production"),
                "ETH": (5, "hydroélectricité seulement"), "KEN": (5, "géothermie et hydroélectricité seulement"), "PAN": (5, "hydroélectricité seulement")},
    "Agriculture": {"TWN": (45, M), "NLD": (65, "grand exportateur agricole")},
    "Métaux": {"ZAF": (75, "or et platine sous-estimés par les rentes"), "KAZ": (55, "grand producteur de métaux"),
               "COD": (50, "cuivre et cobalt, production réduite par la guerre"), "UKR": (45, M + " (minerai de fer)"),
               "PRK": (25, M + " (fer, magnésite)"), "ISR": (10, M + " (potasse, phosphates)"), "NOR": (10, "quelques mines"),
               "ARG": (10, "quelques mines"), "VNM": (10, "quelques mines"), "MYS": (15, "étain"), "SAU": (5, "quelques mines"),
               "THA": (5, "quelques mines"), "JPN": (5, "mines quasi fermées"), "KOR": (5, "mines quasi fermées"),
               "NLD": (0, M), "IRQ": (0, M), "ARE": (0, M), "QAT": (0, M), "SGP": (0, M), "TWN": (0, M), "BGD": (0, M)},
    "Terres rares": {"RUS": (15, "part de l'ex-URSS (2 000 t) non répartie"), "KAZ": (8, "part de l'ex-URSS"), "UKR": (5, "part de l'ex-URSS"),
                     "VNM": (5, "production probable selon l'USGS"), "PRK": (5, "production probable selon l'USGS"),
                     "IDN": (3, "production probable selon l'USGS"), "AUS": (5, "réserves, pas de production en 2000"),
                     "BRA": (5, "réserves, pas de production en 2000"), "ZAF": (3, "réserves, pas de production en 2000")},
    "Autres": {"PRK": (20, M), "TWN": (15, M), "NOR": (65, "pêche non comptée"), "CHL": (70, "pêche non comptée"),
               "ETH": (45, "bois de feu surpondéré"), "NGA": (55, "bois de feu surpondéré"), "KEN": (40, "bois de feu surpondéré")},
    "Éducation": {"SGP": (75, M), "PRK": (55, M), "CUB": (75, "système éducatif réputé, données partielles")},
    "Culture": {"USA": (100, "première puissance culturelle"), "GBR": (88, "rayonnement de l'anglais et des médias"), "JPN": (80, "culture populaire"),
                "DEU": (78, "rayonnement culturel"), "MEX": (55, "tourisme surpondéré"), "POL": (45, "tourisme surpondéré"),
                "CHN": (60, "rayonnement encore limité en 2000"), "IND": (60, "cinéma et diaspora"), "KOR": (50, "avant l'essor de la vague coréenne"),
                "CAN": (60, "rayonnement modéré"), "PRK": (5, M), "TWN": (45, M)},
    "Urbanisation": {"TWN": (78, M)},
    "Inégalités": {"IND": (65, M), "JPN": (75, M), "KOR": (72, M), "SAU": (45, M), "IRQ": (60, M), "ARE": (45, M), "QAT": (40, M),
                   "SGP": (45, M), "PRK": (70, M), "TWN": (75, M), "DZA": (70, M), "COD": (40, M), "CUB": (70, M),
                   "PAK": (70, "Gini de consommation, plus bas que celui des revenus"), "ETH": (70, "Gini de consommation"),
                   "IDN": (70, "Gini de consommation"), "EGY": (70, "Gini de consommation"), "BGD": (70, "Gini de consommation"),
                   "NGA": (45, "inégalités sous-estimées par la consommation")},
    "Commerce": {"PRK": (3, M), "TWN": (70, M), "NGA": (40, M + " (pétrole)"), "ETH": (8, M), "VEN": (45, M + " (pétrole)"),
                 "IRQ": (35, "exportations limitées au programme Pétrole contre nourriture")},
    "Gestion": {"TWN": (75, M)},
    "Puissance financière": {"PRK": (2, M), "TWN": (65, M + " (fortes réserves de change)")},
    "Infrastructure": {"TWN": (82, M)},
    "Terrestre": {"USA": (100, "première armée du monde"), "CHN": (88, "plus grande armée du monde"), "RUS": (85, "armée de masse, matériel abondant"),
                  "ISR": (65, "armée très efficace"), "PAK": (65, "grande armée"), "IRQ": (50, "armée affaiblie depuis 1991"),
                  "ITA": (50, "surestimé par les dépenses"), "FRA": (60, "armée professionnelle moyenne"), "GBR": (58, "armée professionnelle réduite"),
                  "BRA": (50, "armée peu équipée"), "JPN": (50, "forces d'autodéfense"), "SAU": (45, "équipement important, faible efficacité"),
                  "UKR": (52, "héritage soviétique"), "SGP": (35, "petit pays"), "COL": (40, "armée de contre-insurrection"),
                  "CAN": (35, "petite armée"), "PAN": (2, "pas d'armée depuis 1990")},
    "Spatial": {"USA": (100, "première puissance spatiale"), "RUS": (85, "héritage soviétique"), "FRA": (50, "Ariane et CNES"),
                "JPN": (45, "lanceurs et satellites"), "CHN": (45, "lanceurs Longue Marche, avant les vols habités"),
                "IND": (35, "lanceur PSLV"), "UKR": (30, "industrie des lanceurs Zenit et Tsiklon"), "GBR": (25, "pas de lanceur depuis 1971"),
                "ISR": (25, "lanceur Shavit, satellites espions"), "DEU": (25, "industrie spatiale européenne"), "IDN": (8, "simple client"),
                "KOR": (10, "débuts")},
    "Chimique": {"USA": (90, "stock en cours de destruction"), "KOR": (50, "stock déclaré"), "IND": (40, "stock déclaré"),
                 "PRK": (70, "stock non déclaré présumé important"), "ISR": (35, "non partie, capacité présumée"),
                 "EGY": (35, "non partie, capacité présumée"), "IRQ": (30, "reliquats incertains après les inspections"),
                 "IRN": (30, "programme soupçonné en 2000"), "CHN": (15, "capacité industrielle, soupçons"), "THA": (0, M),
                 "TWN": (5, M), "COD": (0, M)},
    "Cyber": {"RUS": (72, "FAPSI et héritage du KGB, devant la Chine en 2000"), "CHN": (65, "capacités encore en construction en 2000"),
              "ISR": (68, "unité 8200 de premier plan"), "PRK": (25, "unité naissante en 2000")},
    "Nucléaire": {"PRK": (5, "programme plutonium, pas d'arme"), "IRN": (3, "programme naissant")},
    "Terre": {"TWN": (25, M), "SAU": (50, "pâturages désertiques surpondérés"), "KAZ": (65, "steppe surpondérée"),
              "AUS": (85, "pâturages arides surpondérés")},
    "Eau": {"TWN": (55, M)},
    "Air": {"TWN": (45, M)},
    "Biodiversité": {"TWN": (40, M), "CUB": (30, "indice Liste rouge sévère pour les espèces endémiques"),
                     "ISR": (30, "indice Liste rouge sévère")},
    "Forêt": {"TWN": (60, M)},
}


def main():
    attributs, pays = {}, {i: {"nom": D["pays"][i]["nom"], "scores": {}} for i in PAYS}
    for attribut, (famille, definition, bruts) in FORMULES.items():
        ajust = AJUSTEMENTS.get(attribut, {})
        attributs[attribut] = {"famille": famille, "definition": definition,
                               "ajustements": {i: r for i, (_, r) in ajust.items()}}
        for i in PAYS:
            s = ajust[i][0] if i in ajust else bruts.get(i)
            if s is None:
                raise SystemExit(f"{attribut} : aucun score pour {i}, ajouter un ajustement")
            pays[i]["scores"][attribut] = round(min(100.0, max(0.0, s)))
    json.dump({"annee": 2000, "principe": "Estimations réalistes 0-100 (100 = le plus fort des 50 pays), "
               "formule sur les données 2000 puis corrections de réalisme documentées",
               "attributs": attributs, "pays": pays}, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    if "--revue" in sys.argv:
        for attribut, (_, _, bruts) in FORMULES.items():
            t = sorted(bruts.items(), key=lambda x: -x[1])
            manque = [i for i in PAYS if i not in bruts]
            print(f"{attribut}: " + " ".join(f"{i}{s:.0f}" for i, s in t) + (f" | MANQUE {manque}" if manque else ""))
    else:
        main()
