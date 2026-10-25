"""Collecte les données réelles de l'an 2000 pour les 30 attributs des 50 pays (v0.2).

Usage : python3 -I outils/collecter_attributs.py <dossier_cache> > src/data/attributs2000.json
Dépendances : openpyxl (lecture du fichier SIPRI), pdftotext de poppler-utils (lecture du PDF de l'USGS). Les téléchargements sont gardés dans <dossier_cache>.

Règles :
- aucune valeur n'est inventée : sans donnée dans la source, la valeur est null ;
- chaque indicateur cite sa source (SOURCES) et son code dans cette source ;
- année visée 2000 ; à défaut, l'année la plus proche dans [2000 - FENETRE, 2000 + FENETRE]
  (à égalité, la plus ancienne), et l'année réelle est enregistrée avec la valeur ;
- les pages Wikipedia sont lues à une révision fixe (oldid), pour que la collecte soit reproductible ;
- exceptions demandées le 25/10/2026, marquées "e": 1 et "ESTIMATION" : religion (composition Pew 2020),
  naval et aérien (indices estimés par le projet), cyber (indice calculé).
"""
import csv, json, os, re, sys, time, urllib.error, urllib.request

ANNEE, FENETRE = 2000, 3
UA = "OccidentBricsDataBot/0.2 (https://github.com/YoYoYoAl/Occident-Brics)"

PAYS = {  # ISO3 -> (nom français, nom anglais utilisé par Wikipedia)
    "USA": ("États-Unis", "United States"), "CHN": ("Chine", "China"), "RUS": ("Russie", "Russia"),
    "IND": ("Inde", "India"), "BRA": ("Brésil", "Brazil"), "ZAF": ("Afrique du Sud", "South Africa"),
    "JPN": ("Japon", "Japan"), "DEU": ("Allemagne", "Germany"), "GBR": ("Royaume-Uni", "United Kingdom"),
    "FRA": ("France", "France"), "ITA": ("Italie", "Italy"), "CAN": ("Canada", "Canada"),
    "AUS": ("Australie", "Australia"), "KOR": ("Corée du Sud", "South Korea"), "MEX": ("Mexique", "Mexico"),
    "IDN": ("Indonésie", "Indonesia"), "TUR": ("Turquie", "Turkey"), "SAU": ("Arabie saoudite", "Saudi Arabia"),
    "ARG": ("Argentine", "Argentina"), "POL": ("Pologne", "Poland"), "UKR": ("Ukraine", "Ukraine"),
    "ESP": ("Espagne", "Spain"), "NLD": ("Pays-Bas", "Kingdom of the Netherlands"), "NOR": ("Norvège", "Norway"),
    "IRN": ("Iran", "Iran"), "IRQ": ("Irak", "Iraq"), "ISR": ("Israël", "Israel"), "EGY": ("Égypte", "Egypt"),
    "ARE": ("Émirats arabes unis", "United Arab Emirates"), "QAT": ("Qatar", "Qatar"),
    "PAK": ("Pakistan", "Pakistan"), "VNM": ("Viêt Nam", "Vietnam"), "THA": ("Thaïlande", "Thailand"),
    "MYS": ("Malaisie", "Malaysia"), "SGP": ("Singapour", "Singapore"), "PHL": ("Philippines", "Philippines"),
    "PRK": ("Corée du Nord", "North Korea"), "TWN": ("Taïwan", "Republic of China"),
    "KAZ": ("Kazakhstan", "Kazakhstan"), "BGD": ("Bangladesh", "Bangladesh"), "NGA": ("Nigeria", "Nigeria"),
    "ETH": ("Éthiopie", "Ethiopia"), "KEN": ("Kenya", "Kenya"), "DZA": ("Algérie", "Algeria"),
    "COD": ("RD Congo", "Congo, Democratic Republic of the"), "VEN": ("Venezuela", "Venezuela"),
    "COL": ("Colombie", "Colombia"), "CHL": ("Chili", "Chile"), "CUB": ("Cuba", "Cuba"), "PAN": ("Panama", "Panama"),
}

SOURCES = {
    "bm_wdi": {"nom": "Banque mondiale, World Development Indicators", "url": "https://api.worldbank.org/v2/ (source 2)"},
    "bm_wgi": {"nom": "Banque mondiale, Worldwide Governance Indicators (estimations de -2,5 à +2,5)", "url": "https://api.worldbank.org/v2/ (source 3)"},
    "sipri": {"nom": "SIPRI Military Expenditure Database 1949-2025 (v1.2)", "url": "https://www.sipri.org/sites/default/files/SIPRI-Milex-data-1949-2025_v1.2.xlsx"},
    "owid_co2": {"nom": "Our World in Data, co2-data (Global Carbon Budget ; PIB : Maddison Project Database)", "url": "https://github.com/owid/co2-data"},
    "owid_energie": {"nom": "Our World in Data, energy-data (Energy Institute Statistical Review, EIA)", "url": "https://github.com/owid/energy-data"},
    "owid_grapher": {"nom": "Our World in Data, graphiques (source d'origine indiquée par indicateur)", "url": "https://ourworldindata.org/grapher/"},
    "usgs": {"nom": "U.S. Geological Survey, Minerals Yearbook 2000, Rare earths (J. B. Hedrick)", "url": "https://d9-wret.s3.us-west-2.amazonaws.com/assets/palladium/production/mineral-pubs/rare-earth/740400.pdf"},
    "sipri_at": {"nom": "SIPRI Arms Transfers Database (registre des transferts)", "url": "https://atbackend.sipri.org/api/p/trades/trade-register-csv/"},
    "calcul": {"nom": "Calcul du projet à partir des indicateurs sourcés ci-dessus (formule dans outils/collecter_attributs.py)", "url": "https://github.com/YoYoYoAl/Occident-Brics"},
    "estimation_projet": {"nom": "Estimation du projet (jugement d'expert, table ESTIMATIONS_MILITAIRES de outils/collecter_attributs.py)", "url": "https://github.com/YoYoYoAl/Occident-Brics"},
    "wikipedia": {"nom": "Wikipedia (en), révision fixe indiquée par indicateur", "url": "https://en.wikipedia.org/"},
}

# Indicateurs : clé -> (nom, unité, famille, attribut, source, code, note)
# famille et attribut reprennent src/data/attributs.ts ; "Ensemble" = indicateur de toute la famille.
I = {}
def ind(cle, nom, unite, famille, attribut, source, code, note=None):
    I[cle] = {"nom": nom, "unite": unite, "famille": famille, "attribut": attribut, "source": source, "code": code, **({"note": note} if note else {})}

# Matières premières
ind("prodPetrole", "Production de pétrole", "TWh", "ressources", "Énergie", "owid_energie", "oil_production")
ind("prodGaz", "Production de gaz", "TWh", "ressources", "Énergie", "owid_energie", "gas_production")
ind("prodCharbon", "Production de charbon", "TWh", "ressources", "Énergie", "owid_energie", "coal_production")
ind("importsEnergie", "Importations nettes d'énergie", "% de la consommation (négatif = exportateur)", "ressources", "Énergie", "bm_wdi", "EG.IMP.CONS.ZS")
ind("prodCereales", "Production de céréales", "t", "ressources", "Agriculture", "bm_wdi", "AG.PRD.CREL.MT")
ind("terresArables", "Terres arables", "ha", "ressources", "Agriculture", "bm_wdi", "AG.LND.ARBL.HA")
ind("agriPib", "Agriculture, sylviculture et pêche", "% du PIB", "ressources", "Agriculture", "bm_wdi", "NV.AGR.TOTL.ZS")
ind("rentesMinerales", "Rentes minérales (métaux et minerais)", "% du PIB", "ressources", "Métaux", "bm_wdi", "NY.GDP.MINR.RT.ZS")
ind("exportsMetaux", "Exportations de minerais et métaux", "% des exportations de marchandises", "ressources", "Métaux", "bm_wdi", "TX.VAL.MMTL.ZS.UN")
ind("terresRares", "Production minière de terres rares", "t d'oxydes (REO)", "ressources", "Terres rares", "usgs", "Minerals Yearbook 2000, Rare earths, table 6",
    "Valeurs 2000 estimées par l'USGS ; 0 = pays absent de la liste des producteurs ; null : ex-URSS (2 000 t non réparties entre Russie, Kazakhstan, Ukraine) "
    "et pays dont l'USGS juge la production probable mais inconnue (Indonésie, Corée du Nord, Viêt Nam)")
ind("rentesNaturelles", "Rentes totales des ressources naturelles", "% du PIB", "ressources", "Autres", "bm_wdi", "NY.GDP.TOTL.RT.ZS")
ind("rentesForestieres", "Rentes forestières", "% du PIB", "ressources", "Autres", "bm_wdi", "NY.GDP.FRST.RT.ZS")
# Population
ind("population", "Population", "habitants", "population", "Effectif", "bm_wdi", "SP.POP.TOTL")
ind("popActive", "Population de 15 à 64 ans", "% de la population", "population", "Effectif", "bm_wdi", "SP.POP.1564.TO.ZS")
ind("anneesEtudes", "Durée moyenne d'études (15-64 ans)", "années", "population", "Éducation", "owid_grapher", "mean-years-of-schooling-long-run", "Lee et Lee (2016), Barro et Lee (2015), via Our World in Data")
ind("scolSecondaire", "Taux brut de scolarisation dans le secondaire", "%", "population", "Éducation", "bm_wdi", "SE.SEC.ENRR")
ind("scolSuperieur", "Taux brut de scolarisation dans le supérieur", "%", "population", "Éducation", "bm_wdi", "SE.TER.ENRR")
ind("esperanceVie", "Espérance de vie à la naissance", "années", "population", "Santé", "bm_wdi", "SP.DYN.LE00.IN")
ind("mortaliteInfantile", "Mortalité infantile", "pour 1 000 naissances", "population", "Santé", "bm_wdi", "SP.DYN.IMRT.IN")
ind("depensesSante", "Dépenses de santé", "% du PIB", "population", "Santé", "bm_wdi", "SH.XPD.CHEX.GD.ZS")
ind("fecondite", "Indice de fécondité", "enfants par femme", "population", "Fertilité", "bm_wdi", "SP.DYN.TFRT.IN")
ind("touristes", "Arrivées de touristes internationaux", "arrivées", "population", "Culture", "bm_wdi", "ST.INT.ARVL", "Indicateur indirect du rayonnement culturel")
RELIGIONS = [("chretiens", "Christians", "Chrétiens"), ("musulmans", "Muslims", "Musulmans"), ("sansReligion", "Unaffiliated", "Sans religion"),
             ("hindous", "Hindus", "Hindous"), ("bouddhistes", "Buddhists", "Bouddhistes"), ("autresReligions", "Other religions", "Autres religions"),
             ("juifs", "Jews", "Juifs")]
for cle, _, nom in RELIGIONS:
    ind(cle, nom, "% de la population", "population", "Religion", "wikipedia", "Religions_by_country@1378781963",
        "ESTIMATION pour 2000 : composition 2020 du Pew Research Center (juin 2025), reprise telle quelle ; "
        "écart probable de quelques points, plus fort là où la sécularisation a été rapide ; « <10 000 » compté 0")
ind("urbanisation", "Population urbaine", "% de la population", "population", "Urbanisation", "bm_wdi", "SP.URB.TOTL.IN.ZS")
ind("gini", "Indice de Gini", "0 à 100", "population", "Inégalités", "bm_wdi", "SI.POV.GINI")
ind("part10Haut", "Part du revenu des 10 % les plus aisés", "%", "population", "Inégalités", "bm_wdi", "SI.DST.10TH.10")
# Économie
ind("commercePib", "Commerce extérieur (exportations + importations)", "% du PIB", "economie", "Commerce", "bm_wdi", "NE.TRD.GNFS.ZS")
ind("exportations", "Exportations de biens et services", "$ courants", "economie", "Commerce", "bm_wdi", "NE.EXP.GNFS.CD")
ind("efficaciteGouv", "Efficacité des pouvoirs publics", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_GE.EST")
ind("qualiteRegl", "Qualité de la réglementation", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_RQ.EST")
ind("controleCorruption", "Maîtrise de la corruption", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_CC.EST")
ind("etatDroit", "État de droit", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_RL.EST")
ind("stabilitePol", "Stabilité politique et absence de violence", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_PV.EST")
ind("voixResponsabilite", "Voix citoyenne et responsabilité", "-2,5 à +2,5", "economie", "Gestion", "bm_wgi", "GOV_WGI_VA.EST")
ind("pibNominal", "PIB", "$ courants", "economie", "Puissance financière", "bm_wdi", "NY.GDP.MKTP.CD")
ind("pibPpa", "PIB (parité de pouvoir d'achat)", "$ internationaux 2011", "economie", "Puissance financière", "owid_co2", "gdp")
ind("reserves", "Réserves totales (or compris)", "$ courants", "economie", "Puissance financière", "bm_wdi", "FI.RES.TOTL.CD")
ind("capitalisation", "Capitalisation boursière des sociétés cotées", "$ courants", "economie", "Puissance financière", "bm_wdi", "CM.MKT.LCAP.CD")
ind("detteEtat", "Dette de l'administration centrale", "% du PIB", "economie", "Puissance financière", "bm_wdi", "GC.DOD.TOTL.GD.ZS")
ind("inflation", "Inflation (prix à la consommation)", "% par an", "economie", "Puissance financière", "bm_wdi", "FP.CPI.TOTL.ZG")
ind("accesElectricite", "Accès à l'électricité", "% de la population", "economie", "Infrastructure", "bm_wdi", "EG.ELC.ACCS.ZS")
ind("electriciteParHab", "Consommation d'électricité par habitant", "kWh", "economie", "Infrastructure", "bm_wdi", "EG.USE.ELEC.KH.PC")
ind("internet", "Utilisateurs d'Internet", "% de la population", "economie", "Infrastructure", "bm_wdi", "IT.NET.USER.ZS")
ind("telFixe", "Lignes téléphoniques fixes", "pour 100 habitants", "economie", "Infrastructure", "bm_wdi", "IT.MLT.MAIN.P2")
ind("mobile", "Abonnements au téléphone mobile", "pour 100 habitants", "economie", "Infrastructure", "bm_wdi", "IT.CEL.SETS.P2")
ind("rail", "Réseau ferré", "km", "economie", "Infrastructure", "bm_wdi", "IS.RRS.TOTL.KM")
# Puissance militaire
ind("depensesMil", "Dépenses militaires", "millions de $ constants 2024", "militaire", "Ensemble", "sipri", "Constant (2024) US$")
ind("depensesMilPib", "Dépenses militaires", "% du PIB", "militaire", "Ensemble", "sipri", "Share of GDP", "Part publiée par le SIPRI (0,031) convertie en pourcentage (3,1)")
ind("effectifsArmes", "Effectifs des forces armées", "personnes", "militaire", "Terrestre", "bm_wdi", "MS.MIL.TOTL.P1", "IISS Military Balance via la Banque mondiale ; toutes armées confondues (indicateur indirect de la force terrestre)")
ind("naviresImportes", "Navires de guerre importés 1981-2000", "millions de TIV SIPRI", "militaire", "Naval", "sipri_at", "Ships, livraisons 1981-2000",
    "Valeur militaire (TIV) des navires livrés par l'étranger en 20 ans ; ignore la production nationale (indicateur de dépendance, pas de taille de flotte)")
ind("avionsImportes", "Aéronefs militaires importés 1981-2000", "millions de TIV SIPRI", "militaire", "Aérien", "sipri_at", "Aircraft, livraisons 1981-2000",
    "Valeur militaire (TIV) des aéronefs livrés par l'étranger en 20 ans ; ignore la production nationale (indicateur de dépendance, pas de taille de flotte)")
ind("indiceNaval", "Puissance navale estimée", "0 à 100 (États-Unis = 100)", "militaire", "Naval", "estimation_projet", "ESTIMATIONS_MILITAIRES",
    "ESTIMATION experte du projet : ordre de grandeur relatif de la puissance navale en 2000 (tonnage, porte-avions, sous-marins, "
    "état de la flotte), pas une mesure ; à ajuster au jeu")
ind("indiceAerien", "Puissance aérienne estimée", "0 à 100 (États-Unis = 100)", "militaire", "Aérien", "estimation_projet", "ESTIMATIONS_MILITAIRES",
    "ESTIMATION experte du projet : ordre de grandeur relatif de la puissance aérienne en 2000 (nombre et génération des avions de combat, "
    "entraînement, soutien), pas une mesure ; à ajuster au jeu")
ind("indiceCyber", "Indice cyber estimé", "0 à 100", "militaire", "Cyber", "calcul", "50 % rang + 25 % internautes + 25 % dépenses militaires",
    "ESTIMATION : 50 % rang étatique fixé par le projet (1 : États-Unis ; 2 : Russie, Chine, Royaume-Uni, Israël, France ; "
    "3 : Allemagne, Canada, Australie, Japon, Corée du Sud, Inde, Taïwan, Pays-Bas, Corée du Nord), 25 % nombre d'internautes "
    "et 25 % dépenses militaires (échelles logarithmiques, normalisées sur les 50 pays)")
ind("objetsSpatiaux", "Objets lancés dans l'espace (cumul)", "objets", "militaire", "Spatial", "owid_grapher", "cumulative-number-of-objects-launched-into-outer-space", "Registre de l'ONU (UNOOSA) via Our World in Data ; 0 si le pays n'apparaît pas")
ind("lanceurOrbital", "Lancement orbital autonome réussi avant 2001", "1 = oui, 0 = non", "militaire", "Spatial", "wikipedia", "Timeline_of_first_orbital_launches_by_country@1380598983", "Russie : premier lancement de l'Union soviétique (1957), dont elle a repris le programme ; Ukraine : 1991 selon la page")
ind("partieCiac", "Partie à la Convention sur les armes chimiques fin 2000", "1 = oui, 0 = non", "militaire", "Chimique", "wikipedia", "List_of_parties_to_the_Chemical_Weapons_Convention@1357135945", "Date d'entrée en vigueur pour l'État ; Taïwan non éligible (null)")
ind("stockChimique", "Stock d'armes chimiques déclaré à l'OIAC (déclaration initiale)", "t", "militaire", "Chimique", "wikipedia", "Chemical_Weapons_Convention@1379189860", "Pour les parties fin 2000 ; 0 = partie sans stock déclaré (Japon : armes abandonnées en Chine, hors stock) ; Corée du Sud : borne basse de la fourchette 3 000-3 500 t ; null = non partie (stock inconnu)")
ind("ogives", "Ogives nucléaires du stock militaire", "ogives", "militaire", "Nucléaire", "owid_grapher", "nuclear-warhead-stockpiles", "Federation of American Scientists via Our World in Data ; 0 si le pays n'est pas dans la liste des puissances nucléaires de la FAS")
# Environnement
ind("superficie", "Superficie terrestre", "km²", "environnement", "Terre", "bm_wdi", "AG.LND.TOTL.K2")
ind("terresAgricoles", "Terres agricoles", "% de la superficie", "environnement", "Terre", "bm_wdi", "AG.LND.AGRI.ZS")
ind("eauRenouvelable", "Ressources internes renouvelables en eau douce par habitant", "m³", "environnement", "Eau", "bm_wdi", "ER.H2O.INTR.PC")
ind("prelevementsEau", "Prélèvements d'eau douce", "% des ressources internes", "environnement", "Eau", "bm_wdi", "ER.H2O.FWTL.ZS")
ind("eauPotable", "Accès au moins à un service d'eau potable de base", "% de la population", "environnement", "Eau", "bm_wdi", "SH.H2O.BASW.ZS")
ind("pm25", "Exposition moyenne aux particules fines PM2,5", "µg/m³", "environnement", "Air", "bm_wdi", "EN.ATM.PM25.MC.M3")
ind("co2", "Émissions de CO2", "Mt", "environnement", "Climat", "owid_co2", "co2")
ind("co2ParHab", "CO2 par habitant", "t", "environnement", "Climat", "owid_co2", "co2_per_capita")
ind("gesTotal", "Émissions de gaz à effet de serre", "t équivalent CO2", "environnement", "Climat", "owid_grapher", "total-ghg-emissions", "Jones et al. (2025), via Our World in Data")
ind("listeRouge", "Indice Liste rouge (0 = toutes espèces éteintes, 1 = aucune menacée)", "0 à 1", "environnement", "Biodiversité", "owid_grapher", "red-list-index", "UICN et BirdLife, indicateur ODD 15.5.1, via Our World in Data")
ind("sitesProteges", "Sites clés de biodiversité terrestre couverts par des aires protégées", "%", "environnement", "Biodiversité", "owid_grapher", "protected-terrestrial-biodiversity-sites", "Indicateur ODD 15.1.2, via Our World in Data")
ind("forets", "Surface forestière", "% de la superficie", "environnement", "Forêt", "bm_wdi", "AG.LND.FRST.ZS")
ind("foretsKm2", "Surface forestière", "km²", "environnement", "Forêt", "bm_wdi", "AG.LND.FRST.K2")

# Compléments quand la source principale n'a pas de valeur (Taïwan, absent de la Banque mondiale) :
# même donnée d'origine (UN World Population Prospects), via Our World in Data. La valeur garde sa propre source.
COMPLEMENTS = {
    "population": ("owid_co2", "population"),
    "esperanceVie": ("owid_grapher", "life-expectancy"),
    "fecondite": ("owid_grapher", "children-per-woman-un"),
}

# Attributs sans indicateur sourcé : raison affichée dans le jeu.
SANS_SOURCE = {
}


# Indicateurs pour lesquels 0 est impossible : un 0 publié est un manque de donnée, pas une mesure
# (la Banque mondiale publie 0 pour les comptes nationaux du Venezuela de 1997 à 2003). Il devient null.
ZERO_IMPOSSIBLE = {"exportations", "commercePib", "agriPib", "pibNominal", "population", "superficie", "esperanceVie", "fecondite"}


def telecharger(url, cache, nom):
    chemin = os.path.join(cache, nom)
    if not os.path.exists(chemin):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        for essai in range(5):  # Wikipedia limite le débit (erreur 429) : nouvel essai après une pause croissante
            try:
                with urllib.request.urlopen(req, timeout=180) as r:
                    contenu = r.read()
                break
            except urllib.error.HTTPError as e:
                if e.code != 429 or essai == 4:
                    raise
                time.sleep(15 * 2 ** essai)
        with open(chemin + ".part", "wb") as f:
            f.write(contenu)
        os.replace(chemin + ".part", chemin)
    return chemin


def choisir(series):
    """series : {annee: valeur}. Renvoie {"v", "a"} pour l'année la plus proche de 2000 dans la fenêtre, sinon None."""
    annees = sorted((abs(a - ANNEE), a) for a, v in series.items() if v is not None and abs(a - ANNEE) <= FENETRE)
    return {"v": series[annees[0][1]], "a": annees[0][1]} if annees else None


def banque_mondiale(code, source, cache):
    isos = ";".join(i for i in PAYS if i != "TWN")  # Taïwan n'est pas couvert par la Banque mondiale
    url = (f"https://api.worldbank.org/v2/country/{isos}/indicator/{code}?format=json&per_page=2000"
           f"&date={ANNEE - FENETRE}:{ANNEE + FENETRE}&source={source}")
    d = json.load(open(telecharger(url, cache, f"bm_{code}.json"), encoding="utf-8"))
    series = {}
    for r in d[1] or []:
        series.setdefault(r["countryiso3code"], {})[int(r["date"])] = r["value"]
    return {iso: choisir(series.get(iso, {})) for iso in PAYS}


def owid_csv(chemin, colonne, cle_iso="iso_code", cle_annee="year"):
    series = {}
    with open(chemin, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r[cle_iso] in PAYS and r[colonne] not in ("", None):
                series.setdefault(r[cle_iso], {})[int(r[cle_annee])] = float(r[colonne])
    return series


def sipri(cache, feuille):
    import openpyxl
    wb = openpyxl.load_workbook(telecharger(SOURCES["sipri"]["url"], cache, "sipri.xlsx"), read_only=True, data_only=True)
    lignes = list(wb[feuille].iter_rows(values_only=True))
    entete = next(i for i, l in enumerate(lignes) if l and l[0] == "Country")
    cols = {c: j for j, c in enumerate(lignes[entete]) if isinstance(c, int)}
    noms = {"United States of America": "USA", "China": "CHN", "Russia": "RUS", "India": "IND", "Brazil": "BRA",
            "South Africa": "ZAF", "Japan": "JPN", "Germany": "DEU", "United Kingdom": "GBR", "France": "FRA",
            "Italy": "ITA", "Canada": "CAN", "Australia": "AUS", "Korea, South": "KOR", "Mexico": "MEX",
            "Indonesia": "IDN", "Türkiye": "TUR", "Saudi Arabia": "SAU", "Argentina": "ARG", "Poland": "POL",
            "Ukraine": "UKR", "Spain": "ESP", "Netherlands": "NLD", "Norway": "NOR", "Iran": "IRN", "Iraq": "IRQ",
            "Israel": "ISR", "Egypt": "EGY", "United Arab Emirates": "ARE", "Qatar": "QAT", "Pakistan": "PAK",
            "Viet Nam": "VNM", "Thailand": "THA", "Malaysia": "MYS", "Singapore": "SGP", "Philippines": "PHL",
            "Korea, North": "PRK", "Taiwan": "TWN", "Kazakhstan": "KAZ", "Bangladesh": "BGD", "Nigeria": "NGA",
            "Ethiopia": "ETH", "Kenya": "KEN", "Algeria": "DZA", "Congo, DR": "COD", "Venezuela": "VEN",
            "Colombia": "COL", "Chile": "CHL", "Cuba": "CUB", "Panama": "PAN"}
    series = {}
    for l in lignes[entete + 1:]:
        if l and isinstance(l[0], str) and l[0].strip() in noms:
            iso = noms[l[0].strip()]
            series[iso] = {a: (float(l[j]) if isinstance(l[j], (int, float)) else None)
                           for a, j in cols.items() if abs(a - ANNEE) <= FENETRE}
    manquants = sorted(set(noms.values()) - set(series))
    if manquants:
        raise SystemExit(f"SIPRI {feuille} : pays introuvables {manquants}")
    return {iso: choisir(series.get(iso, {})) for iso in PAYS}


def wikitexte(code, cache):
    titre, rev = code.split("@")
    url = f"https://en.wikipedia.org/w/index.php?oldid={rev}&action=raw"
    return open(telecharger(url, cache, f"wp_{rev}.txt"), encoding="utf-8").read()


MOIS = {m: i for i, m in enumerate(["January", "February", "March", "April", "May", "June", "July", "August",
                                     "September", "October", "November", "December"], 1)}


def ciac(cache):
    """partieCiac : 1 si l'entrée en vigueur pour l'État est au plus tard le 31/12/2000."""
    texte = wikitexte(I["partieCiac"]["code"], cache)
    parties = {}
    for bloc in texte.split("\n|-\n"):
        m = re.search(r"\{\{Flag(?:country)?\|([^}|]+)", bloc)
        dates = re.findall(r"\{\{Dts\|(\d{4})\|(\w+)\|(\d+)", bloc)
        if m and dates:
            a, mo, j = dates[-1]
            parties[m.group(1).strip()] = (int(a), MOIS[mo], int(j))
    if len(parties) < 190:
        raise SystemExit(f"CIAC : {len(parties)} parties lues, page modifiée ?")
    sortie = {}
    for iso, (_, en) in PAYS.items():
        if iso == "TWN":
            sortie[iso] = None
        else:
            sortie[iso] = {"v": 1 if en in parties and parties[en] <= (ANNEE, 12, 31) else 0, "a": ANNEE}
    return sortie


def stock_chimique(cache, partie):
    texte = wikitexte(I["stockChimique"]["code"], cache)
    table = texte[texte.index("Declared stockpile"):]
    table = table[:table.index("\n|}")]
    stocks = {}
    for ligne in table.split("\n|-\n"):
        m = re.search(r"\{\{flagicon\|([^}|]+)\}\}", ligne)
        cellules = re.sub(r"<ref[^>]*/>|<ref[^>]*>.*?</ref>", "", ligne, flags=re.S).split("||")
        t = re.match(r"\s*([\d,]+)", cellules[1]) if len(cellules) > 1 else None
        if m and t:  # cellule 2 = stock déclaré ; fourchette "3,000–3,500" : borne basse
            stocks[m.group(1).strip()] = float(t.group(1).replace(",", ""))
    if not {"United States", "Russia", "India", "South Korea"} <= set(stocks):
        raise SystemExit(f"Stocks chimiques : lecture incomplète {sorted(stocks)}")
    sortie = {}
    for iso, (_, en) in PAYS.items():
        p = partie[iso]
        if p is None or p["v"] == 0:
            sortie[iso] = None
        else:
            sortie[iso] = {"v": stocks.get(en, 0.0), "a": ANNEE}
    return sortie, stocks


def religions(cache):
    """Parts (%) de chaque religion, calculées sur les effectifs 2020 du tableau Pew de Wikipedia."""
    texte = wikitexte(I["chretiens"]["code"], cache)
    i = texte.index("== 2020 Pew Research")
    table = texte[i:texte.index("\n|}", i)]
    entete = [l[1:].strip() for l in table.split("\n") if l.startswith("!")]
    lignes = {}
    for bloc in table.split("\n|-\n")[1:]:
        cellules = [l[1:].strip() for l in bloc.split("\n") if l.startswith("|")]
        m = re.search(r"\[\[(?:[^\]|]*\|)?([^\]]+)\]\]", cellules[0]) if cellules else None
        if m and len(cellules) == len(entete):
            nombres = [0.0 if c.startswith("<") else float(c.replace(",", "")) for c in cellules[1:]]
            lignes[m.group(1)] = dict(zip(entete[1:], nombres))
    alias = {"Kingdom of the Netherlands": "Netherlands", "Republic of China": "Taiwan", "Turkey": "Turkey",
             "Congo, Democratic Republic of the": "Democratic Republic of the Congo"}
    sortie = {cle: {} for cle, _, _ in RELIGIONS}
    for iso, (_, en) in PAYS.items():
        l = lignes[alias.get(en, en)]
        if abs(sum(l[col] for _, col, _ in RELIGIONS) / l["Total"] - 1) > 0.02:
            raise SystemExit(f"Religions {iso} : la somme ne fait pas le total")
        for cle, col, _ in RELIGIONS:
            sortie[cle][iso] = {"v": round(100 * l[col] / l["Total"], 2), "a": 2020, "e": 1}
    return sortie


def terres_rares(cache):
    """Table 6 de l'USGS (production minière par pays, 1996-2000), lue avec pdftotext (poppler-utils)."""
    import subprocess
    pdf = telecharger(SOURCES["usgs"]["url"], cache, "usgs_rare_earths_2000.pdf")
    texte = subprocess.run(["pdftotext", "-layout", pdf, "-"], capture_output=True, text=True, check=True).stdout
    i = texte.index("RARE EARTHS: WORLD MINE PRODUCTION, BY COUNTRY")
    table = texte[i:texte.index("Total", i)]
    noms = {"China": "CHN", "India": "IND", "Malaysia": "MYS", "Thailand": "THA", "United States": "USA"}
    prod = {}
    for ligne in table.split("\n"):
        m = re.match(r"\s*([A-Z][A-Za-z. ]+?)(?: e/)?(?: \d/)*\s{2,}(.+)$", ligne)
        if m and m.group(1).strip() in noms:
            cellule = re.split(r"\s{2,}", m.group(2).strip())[-1]  # dernière colonne = 2000
            prod[noms[m.group(1).strip()]] = 0.0 if cellule.startswith("--") else float(cellule.replace(",", ""))
    if prod.get("CHN") != 73000 or len(prod) != len(noms):
        raise SystemExit(f"USGS terres rares : lecture douteuse {prod}")
    inconnus = {"RUS", "KAZ", "UKR", "IDN", "PRK", "VNM"}
    return {iso: None if iso in inconnus else {"v": prod.get(iso, 0.0), "a": ANNEE} for iso in PAYS}


def transferts_sipri(cache, categorie, entite, debut=1981, fin=2000):
    """Somme, par pays destinataire, des TIV livrés entre debut et fin (registre SIPRI des transferts)."""
    chemin = os.path.join(cache, f"sipri_at_{categorie}_{debut}_{fin}.csv")
    if not os.path.exists(chemin):
        filtre = lambda champ, v1="", v2="", liste=(): {"field": champ, "oldField": "", "condition": "contains", "value1": v1, "value2": v2, "listData": list(liste)}
        corps = {"filters": [filtre("Weapon category", liste=[entite]), filtre("Delivery year", debut, fin), filtre("Order year", 0, fin),
                             {**filtre("opendeals"), "condition": ""}], "logic": "AND"}
        req = urllib.request.Request(SOURCES["sipri_at"]["url"] + "?output=csv", data=json.dumps(corps).encode(),
                                     headers={"User-Agent": UA, "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=600) as r:
            import base64
            texte = base64.b64decode(json.load(r)["bytes"]).decode("latin-1")  # export SIPRI en Latin-1
        with open(chemin, "w", encoding="utf-8") as f:
            f.write(texte)
    texte = open(chemin, encoding="utf-8").read()
    lignes = list(csv.reader(texte[texte.index("Recipient,Supplier"):].splitlines()))
    col = lignes[0].index("SIPRI TIV of delivered weapons")
    noms = {"United States": "USA", "China": "CHN", "Russia": "RUS", "India": "IND", "Brazil": "BRA", "South Africa": "ZAF",
            "Japan": "JPN", "Germany": "DEU", "United Kingdom": "GBR", "France": "FRA", "Italy": "ITA", "Canada": "CAN",
            "Australia": "AUS", "South Korea": "KOR", "Mexico": "MEX", "Indonesia": "IDN", "Turkiye": "TUR", "Saudi Arabia": "SAU",
            "Argentina": "ARG", "Poland": "POL", "Ukraine": "UKR", "Spain": "ESP", "Netherlands": "NLD", "Norway": "NOR", "Iran": "IRN",
            "Iraq": "IRQ", "Israel": "ISR", "Egypt": "EGY", "United Arab Emirates": "ARE", "Qatar": "QAT", "Pakistan": "PAK",
            "Viet Nam": "VNM", "Thailand": "THA", "Malaysia": "MYS", "Singapore": "SGP", "Philippines": "PHL", "North Korea": "PRK",
            "Taiwan": "TWN", "Kazakhstan": "KAZ", "Bangladesh": "BGD", "Nigeria": "NGA", "Ethiopia": "ETH", "Kenya": "KEN",
            "Algeria": "DZA", "DR Congo": "COD", "Venezuela": "VEN", "Colombia": "COL", "Chile": "CHL", "Cuba": "CUB", "Panama": "PAN",
            "Soviet Union": "RUS", "West Germany": "DEU", "East Germany": "DEU"}  # États prédécesseurs rattachés au successeur
    total = {}
    for l in lignes[1:]:
        if len(l) > col and l[0] in noms and l[col].strip():
            total[noms[l[0]]] = total.get(noms[l[0]], 0.0) + float(l[col])
    if total.get("IND", 0) <= 0 or total.get("TWN", 0) <= 0:
        raise SystemExit(f"Transferts SIPRI {categorie} : lecture douteuse")
    return {iso: {"v": round(total.get(iso, 0.0), 1), "a": ANNEE} for iso in PAYS}


# Puissances navale et aérienne relatives en 2000 (États-Unis = 100), estimées par le projet à la demande de
# l'utilisateur (25/10/2026), faute de source gratuite : ordres de grandeur, pas des mesures. (naval, aérien)
ESTIMATIONS_MILITAIRES = {
    "USA": (100, 100), "RUS": (45, 50), "CHN": (30, 35), "GBR": (35, 22), "FRA": (32, 22), "JPN": (30, 18), "IND": (18, 20),
    "ITA": (18, 13), "DEU": (14, 16), "KOR": (14, 15), "ESP": (13, 9), "TWN": (13, 15), "TUR": (12, 14), "AUS": (10, 8),
    "CAN": (9, 7), "NLD": (9, 7), "BRA": (9, 7), "PRK": (8, 9), "IDN": (7, 4), "NOR": (6, 5), "PAK": (6, 9), "IRN": (6, 7),
    "EGY": (6, 12), "ISR": (4, 18), "UKR": (4, 12), "ARG": (5, 4), "CHL": (5, 4), "THA": (5, 6), "SAU": (5, 11), "SGP": (5, 6),
    "MYS": (4, 4), "POL": (4, 6), "VNM": (3, 5), "ZAF": (3, 4), "MEX": (3, 2), "DZA": (3, 5), "PHL": (2, 1), "ARE": (2, 6),
    "VEN": (2, 3), "COL": (2, 2), "BGD": (2, 2), "CUB": (1, 2), "QAT": (1, 2), "NGA": (1, 2), "KEN": (1, 1), "IRQ": (1, 4),
    "KAZ": (1, 4), "PAN": (1, 0), "ETH": (0, 2), "COD": (0, 0),
}

# Rang cyber en 2000, jugement du projet (à valider par l'utilisateur) : 1 = puissance de premier plan,
# 2 = grande agence de renseignement électronique établie, 3 = capacité étatique notable.
RANGS_CYBER = {"USA": 1, "RUS": 2, "CHN": 2, "GBR": 2, "ISR": 2, "FRA": 2,
               "DEU": 3, "CAN": 3, "AUS": 3, "JPN": 3, "KOR": 3, "IND": 3, "TWN": 3, "NLD": 3, "PRK": 3}


def indice_cyber(valeurs):
    """50 % rang (1 -> 100, 2 -> 70, 3 -> 40, autres 0) + 25 % internautes (nombre absolu, log)
    + 25 % dépenses militaires (log), normalisés min-max sur les 50 pays ; pondération recalculée si une valeur manque."""
    import math
    def norme_log(x):
        x = {k: math.log10(v) for k, v in x.items() if v and v > 0}
        lo, hi = min(x.values()), max(x.values())
        return {k: (v - lo) / (hi - lo) for k, v in x.items()}
    g = lambda iso, cle: (valeurs[cle][iso] or {}).get("v")
    internautes = norme_log({iso: g(iso, "internet") * g(iso, "population") / 100 for iso in PAYS
                             if g(iso, "internet") is not None and g(iso, "population")})
    defense = norme_log({iso: g(iso, "depensesMil") for iso in PAYS})
    points = {1: 1.0, 2: 0.7, 3: 0.4}
    sortie = {}
    for iso in PAYS:
        parts = [(0.5, points.get(RANGS_CYBER.get(iso), 0.0))]
        parts += [(0.25, n[iso]) for n in (internautes, defense) if iso in n]
        sortie[iso] = {"v": round(100 * sum(p * x for p, x in parts) / sum(p for p, _ in parts), 1), "a": ANNEE, "e": 1}
    return sortie


def premier_lancement(cache):
    texte = wikitexte(I["lanceurOrbital"]["code"], cache)
    table = texte[texte.index('{| class="wikitable'):]
    table = table[:table.index("\n|}")]
    annees = {}
    for bloc in table.split("\n|-")[1:]:
        m = re.search(r"\{\{[Ff]lag(?:country|icon)\|([^}|]+)\}\}", bloc)
        d = [x for x in re.findall(r"\b(\d{1,2}) (\w+) (\d{4})\b", bloc) if x[1] in MOIS]
        if m and d:  # la date du lancement est la dernière cellule de la ligne
            annees.setdefault(m.group(1).strip(), int(d[-1][2]))
    alias = {"Soviet Union": "Russia", "FRA": "France"}
    par_pays = {}
    for nom, a in annees.items():
        par_pays.setdefault(alias.get(nom, nom), a)
    if par_pays.get("United States") != 1958 or par_pays.get("Russia") != 1957:
        raise SystemExit(f"Lancements orbitaux : lecture douteuse {par_pays}")
    return {iso: {"v": 1 if par_pays.get(en, 9999) <= ANNEE else 0, "a": ANNEE} for iso, (_, en) in PAYS.items()}


def cumul(series):
    """Série cumulée publiée seulement les années où elle change : valeur de la dernière année <= 2000, sinon 0."""
    avant = [a for a in series if a <= ANNEE]
    return {"v": series[max(avant)] if avant else 0.0, "a": ANNEE}


def serie_owid(src, code, co2, energie, cache):
    if src in ("owid_co2", "owid_energie"):
        return owid_csv(co2 if src == "owid_co2" else energie, code)
    url = f"https://ourworldindata.org/grapher/{code}.csv?v=1&csvType=full&useColumnShortNames=true"
    chemin = telecharger(url, cache, f"owid_{code}.csv")
    colonne = open(chemin, encoding="utf-8").readline().strip().split(",")[3]
    return owid_csv(chemin, colonne, cle_iso="code")


def main(cache):
    os.makedirs(cache, exist_ok=True)
    valeurs = {cle: None for cle in I}
    co2 = telecharger("https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv", cache, "owid-co2-data.csv")
    energie = telecharger("https://raw.githubusercontent.com/owid/energy-data/master/owid-energy-data.csv", cache, "owid-energy-data.csv")
    for cle, d in I.items():
        src, code = d["source"], d["code"]
        if src in ("bm_wdi", "bm_wgi"):
            valeurs[cle] = banque_mondiale(code, 2 if src == "bm_wdi" else 3, cache)
        elif cle == "objetsSpatiaux":  # registre de l'ONU exhaustif : un pays absent n'a lancé aucun objet
            s = serie_owid(src, code, co2, energie, cache)
            valeurs[cle] = {iso: cumul(s.get(iso, {})) for iso in PAYS}
        elif src.startswith("owid"):
            s = serie_owid(src, code, co2, energie, cache)
            zero = cle == "ogives"  # liste FAS exhaustive des puissances nucléaires : un pays absent n'a aucune ogive
            valeurs[cle] = {iso: choisir(s.get(iso, {})) or ({"v": 0.0, "a": ANNEE} if zero else None) for iso in PAYS}
        elif src == "sipri":
            valeurs[cle] = sipri(cache, code)
    valeurs["partieCiac"] = ciac(cache)
    valeurs["stockChimique"], _ = stock_chimique(cache, valeurs["partieCiac"])
    for iso, v in valeurs["depensesMilPib"].items():
        if v:
            v["v"] = round(v["v"] * 100, 6)
    for cle in ZERO_IMPOSSIBLE:
        for iso, v in valeurs[cle].items():
            if v and v["v"] == 0:
                print(f"{iso}.{cle} : 0 publié par la source, traité comme donnée manquante", file=sys.stderr)
                valeurs[cle][iso] = None
    valeurs["lanceurOrbital"] = premier_lancement(cache)
    valeurs.update(religions(cache))
    valeurs["terresRares"] = terres_rares(cache)
    valeurs["naviresImportes"] = transferts_sipri(cache, "Ships", 1150374)
    valeurs["avionsImportes"] = transferts_sipri(cache, "Aircraft", 1150363)
    valeurs["indiceCyber"] = indice_cyber(valeurs)
    for j, cle in enumerate(("indiceNaval", "indiceAerien")):
        valeurs[cle] = {iso: {"v": float(ESTIMATIONS_MILITAIRES[iso][j]), "a": ANNEE, "e": 1} for iso in PAYS}
    for cle, (src, code) in COMPLEMENTS.items():
        s = serie_owid(src, code, co2, energie, cache)
        for iso in PAYS:
            if valeurs[cle][iso] is None and (v := choisir(s.get(iso, {}))):
                valeurs[cle][iso] = {**v, "s": src, "c": code}
    sortie = {
        "annee": ANNEE, "fenetre": FENETRE, "collecte": "2026-10-25",
        "sources": SOURCES, "indicateurs": I, "sansSource": SANS_SOURCE,
        "pays": {iso: {"nom": nom, "valeurs": {cle: valeurs[cle][iso] for cle in I}} for iso, (nom, _) in PAYS.items()},
    }
    json.dump(sortie, sys.stdout, ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(sys.argv[1])
