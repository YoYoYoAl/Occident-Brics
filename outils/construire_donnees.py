"""Construit src/data/pays2000.json à partir des fichiers Our World in Data.

Usage : python3 -I outils/construire_donnees.py <owid-co2-data.csv> <owid-energy-data.csv> outils/iso_numerique.json
Sources (téléchargées depuis GitHub, dépôts owid/co2-data et owid/energy-data) :
voir SOURCES ci-dessous. Aucune valeur n'est inventée : un indicateur absent reste null.
"""
import csv, json, os, sys

PAYS = {  # ISO3 -> nom français
    "USA": "États-Unis", "CHN": "Chine", "RUS": "Russie", "IND": "Inde", "BRA": "Brésil",
    "ZAF": "Afrique du Sud", "JPN": "Japon", "DEU": "Allemagne", "GBR": "Royaume-Uni", "FRA": "France",
    "ITA": "Italie", "CAN": "Canada", "AUS": "Australie", "KOR": "Corée du Sud", "MEX": "Mexique",
    "IDN": "Indonésie", "TUR": "Turquie", "SAU": "Arabie saoudite", "ARG": "Argentine", "POL": "Pologne",
    "UKR": "Ukraine", "ESP": "Espagne", "NLD": "Pays-Bas", "NOR": "Norvège", "IRN": "Iran",
    "IRQ": "Irak", "ISR": "Israël", "EGY": "Égypte", "ARE": "Émirats arabes unis", "QAT": "Qatar",
    "PAK": "Pakistan", "VNM": "Viêt Nam", "THA": "Thaïlande", "MYS": "Malaisie", "SGP": "Singapour",
    "PHL": "Philippines", "PRK": "Corée du Nord", "TWN": "Taïwan", "KAZ": "Kazakhstan", "BGD": "Bangladesh",
    "NGA": "Nigeria", "ETH": "Éthiopie", "KEN": "Kenya", "DZA": "Algérie", "COD": "RD Congo",
    "VEN": "Venezuela", "COL": "Colombie", "CHL": "Chili", "CUB": "Cuba", "PAN": "Panama",
}
# Extension (25/10/2026) : les 144 autres membres de l'ONU (outils/pays_monde.json), après les 50 pays de la v0.2.
PAYS.update({iso: p["nom"] for iso, p in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "pays_monde.json"),
                                                       encoding="utf-8")).items()})

SOURCES = {
    "owid_co2": "Our World in Data, co2-data (github.com/owid/co2-data) : population (UN WPP et autres, 2024), PIB (Maddison Project Database 2023, $ internationaux 2011), CO2 (Global Carbon Budget 2025)",
    "owid_energie": "Our World in Data, energy-data (github.com/owid/energy-data) : production et consommation d'énergie (Energy Institute Statistical Review 2025, EIA 2025)",
}

INDICATEURS = {  # clé interne -> (fichier, colonne)
    "population": ("co2", "population"),
    "pib": ("co2", "gdp"),
    "co2": ("co2", "co2"),
    "co2ParHab": ("co2", "co2_per_capita"),
    "prodPetrole": ("energie", "oil_production"),
    "prodGaz": ("energie", "gas_production"),
    "prodCharbon": ("energie", "coal_production"),
    "consoEnergie": ("energie", "primary_energy_consumption"),
}


def lire(chemin, annees):
    d = {}
    with open(chemin, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["iso_code"] in PAYS and r["year"] in annees:
                d.setdefault(r["iso_code"], {})[r["year"]] = r
    return d


def nombre(v):
    return float(v) if v not in (None, "") else None


def main(co2, energie, numerique):
    fichiers = {"co2": lire(co2, {"1995", "2000"}), "energie": lire(energie, {"2000"})}
    num = json.load(open(numerique, encoding="utf-8"))
    sortie = {"sources": SOURCES, "annee": 2000, "pays": []}
    for iso, nom in PAYS.items():
        ind = {}
        for cle, (fic, col) in INDICATEURS.items():
            ligne = fichiers[fic].get(iso, {}).get("2000")
            ind[cle] = nombre(ligne[col]) if ligne else None
        p95 = nombre(fichiers["co2"].get(iso, {}).get("1995", {}).get("population"))
        croissance = (ind["population"] / p95) ** (1 / 5) - 1 if p95 and ind["population"] else None
        sortie["pays"].append({"iso3": iso, "idCarte": num[iso], "nom": nom, "indicateurs": ind,
                               "croissancePop9500": croissance})
    json.dump(sortie, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
