"""Collecte des hymnes nationaux des 194 pays du jeu (exécuté par GitHub Actions, workflow hymnes.yml).

Source : Wikidata (pays par code ISO3 P298 -> hymne P85 -> enregistrement audio P51), sinon recherche
d'un enregistrement de l'US Navy Band sur Wikimedia Commons. Seules les licences libres sont gardées
(domaine public, CC0, CC BY, CC BY-SA), notées fichier par fichier dans public/hymnes/hymnes.csv.
Conversion : mp3 mono 48 kHz, 40 kbit/s, -18 LUFS, 100 s au plus avec fondu final de 3 s.
"""
import csv, html, json, re, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

UA = "OccidentBricsGame/0.1 (https://github.com/YoYoYoAl/Occident-Brics)"
RACINE = Path(__file__).resolve().parents[2]
SORTIE = RACINE / "public" / "hymnes"
LIBRES = re.compile(r"public domain|^pd|cc0|cc[ -]by", re.I)
AUDIO = re.compile(r"\.(ogg|oga|mp3|wav|flac|opus|webm)$", re.I)


def get(url, params=None, essais=5):
    if params: url += "?" + urllib.parse.urlencode(params)
    for k in range(essais):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as r: return r.read()
        except Exception as e:
            if k == essais - 1: raise
            time.sleep(2 ** k * 2)


def commons(params):
    for k in range(5):
        time.sleep(0.5 + 3 * k)  # politesse envers l'API ; une réponse d'erreur (limite de débit) est retentée
        d = json.loads(get("https://commons.wikimedia.org/w/api.php", {**params, "format": "json", "maxlag": 5}))
        if "query" in d: return d
    raise RuntimeError(d.get("error", d))


def wikidata(isos):
    valeurs = " ".join(f'"{i}"' for i in isos)
    q = f"""SELECT ?iso ?hymneLabel ?hymneEn ?audio ?paysEn WHERE {{
      VALUES ?iso {{ {valeurs} }} ?pays wdt:P298 ?iso.
      OPTIONAL {{ ?pays rdfs:label ?paysEn FILTER(lang(?paysEn) = "en") }}
      OPTIONAL {{ ?pays p:P85 ?st. ?st ps:P85 ?hymne. FILTER NOT EXISTS {{ ?st pq:P582 ?fin. }}
                 OPTIONAL {{ ?hymne rdfs:label ?hymneEn FILTER(lang(?hymneEn) = "en") }}
                 OPTIONAL {{ ?hymne wdt:P51 ?audio. }} }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en". }} }}"""
    d = json.loads(get("https://query.wikidata.org/sparql", {"query": q, "format": "json"}))
    res = {}
    for b in d["results"]["bindings"]:
        iso = b["iso"]["value"]; e = res.setdefault(iso, {"titre": "", "titreEn": "", "audios": [], "en": ""})
        if "hymneLabel" in b and not e["titre"]: e["titre"] = b["hymneLabel"]["value"]
        if "paysEn" in b: e["en"] = b["paysEn"]["value"]
        if "hymneEn" in b and not e["titreEn"]: e["titreEn"] = b["hymneEn"]["value"]
        if "audio" in b:
            nom = "File:" + urllib.parse.unquote(b["audio"]["value"].rsplit("/", 1)[-1]).replace("_", " ")
            if nom not in e["audios"]: e["audios"].append(nom)
    return res


# Contrôle d'appariement : le pays le plus long cité dans le nom du fichier doit être le bon
# (« South Korea » ≠ South Africa, « Equatorial Guinea » ≠ Guinea), le nom de l'orchestre étant retiré.
ORCHESTRE = re.compile(r"(united states|u\.\s?s\.|us|royal australian) (navy|army)[^,.()-]*band|navy band southwest", re.I)
EXCLUS = re.compile(r"former|imperial|soviet|new mexico|transnistria|american samoa|fifa|jedna si jedina|\bvs\b|\(19\d\d|19\d\d[–-]|march\b.*sousa", re.I)


def pays_cite(titre, noms_en):
    t = ORCHESTRE.sub(" ", titre.lower())
    trouves = [(len(n), iso) for iso, n in noms_en.items() if n and re.search(r"\b" + re.escape(n.lower()), t)]
    return max(trouves)[1] if trouves else None


def mots(texte):
    return {m for m in re.findall(r"\w{4,}", texte.lower())}


def convient(titre, iso, e, noms_en, strict):
    if EXCLUS.search(titre): return False
    cite = pays_cite(titre, noms_en)
    if cite: return cite == iso
    if not strict: return True  # fichier donné par Wikidata pour cet hymne, sans nom de pays
    titres = mots(e["titreEn"]) | mots(e["titre"])
    return bool(titres and len(titres & mots(ORCHESTRE.sub(" ", titre))) >= min(2, len(titres)))


def recherche(e, requetes=()):
    vus = []
    for q in (*requetes, f'"{e["en"]}" national anthem', f'intitle:"{e["en"]}" anthem', f'"{e["titreEn"]}" anthem' if e["titreEn"] else ""):
        if not q: continue
        d = commons({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 15, "srsearch": q})
        vus += [r["title"] for r in d["query"]["search"] if AUDIO.search(r["title"]) and r["title"] not in vus]
    return vus


def infos(titre):
    d = commons({"action": "query", "titles": titre, "prop": "imageinfo", "iiprop": "url|extmetadata|mime"})
    page = next(iter(d["query"]["pages"].values()))
    if "imageinfo" not in page: return None
    ii = page["imageinfo"][0]; m = ii.get("extmetadata", {})
    texte = lambda k: html.unescape(re.sub(r"<[^>]+>", "", m.get(k, {}).get("value", ""))).strip()
    return {"url": ii["url"], "page": ii.get("descriptionurl", ""), "licence": texte("LicenseShortName"), "auteur": texte("Artist")[:120]}


def preference(t):
    t = t.lower()
    return (0 if "navy band" in t else 1 if "instrumental" in t else 2, 0 if t.endswith((".ogg", ".oga", ".mp3")) else 1)


def main():
    pays = json.loads((RACINE / "src" / "data" / "pays2000.json").read_text("utf8"))["pays"]
    isos = [p["iso3"] for p in pays]; noms = {p["iso3"]: p["nom"] for p in pays}
    SORTIE.mkdir(parents=True, exist_ok=True)
    # fusion : on garde les lignes déjà collectées, sauf celles à refaire (a_refaire.txt : code ISO3 [titre Commons imposé])
    csv_existant = SORTIE / "hymnes.csv"
    gardees = {l["iso3"]: l for l in csv.DictReader(open(csv_existant, encoding="utf8"), delimiter=";")} if csv_existant.exists() else {}
    imposes, requetes, sans = {}, {}, set()
    fichier_refaire = Path(__file__).with_name("a_refaire.txt")
    if fichier_refaire.exists():
        for ligne in fichier_refaire.read_text("utf8").splitlines():
            ligne = ligne.split("#")[0].strip()
            if not ligne: continue
            iso, _, titre = ligne.partition(" "); gardees.pop(iso, None)
            titre = titre.strip()
            if titre == "-": sans.add(iso)  # « - » : aucun enregistrement fiable trouvé, pays laissé sans hymne
            elif titre.startswith("?"): requetes.setdefault(iso, []).append(titre[1:].strip())  # « ?texte » : recherche Commons à essayer d'abord
            elif titre: imposes[iso] = titre
    a_faire = [i for i in isos if i not in gardees and i not in sans]
    print(f"{len(gardees)} gardés, {len(a_faire)} à collecter : {' '.join(a_faire)}")
    wd = {}
    for k in range(0, len(isos), 50): wd.update(wikidata(isos[k:k + 50])); time.sleep(1)
    noms_en = {i: wd.get(i, {}).get("en", "") for i in isos}
    lignes, manquants = dict(gardees), []
    for iso in a_faire:
        e = wd.get(iso, {"titre": "", "titreEn": "", "audios": [], "en": ""})
        if iso in imposes: candidats = [(imposes[iso], False)]
        else:
            candidats = [(c, False) for c in sorted(e["audios"], key=preference) if convient(c, iso, e, noms_en, False)]
            if not any("navy band" in c.lower() for c, _ in candidats) and e["en"]:
                try:
                    trouves = recherche(e, requetes.get(iso, ()))
                    # les résultats d'une requête dédiée (?texte) sont acceptés sans contrôle de titre, sauf autre pays cité
                    souple = set(recherche(e, requetes[iso])[:3]) if iso in requetes else set()
                    candidats = [(c, True) for c in sorted(trouves, key=preference) if convient(c, iso, e, noms_en, c not in souple)] + candidats
                except Exception as err: print(iso, "recherche", err, file=sys.stderr)
        choisi = None
        for c, _ in candidats:
            try: i = infos(c)
            except Exception as err: print(iso, c, err); continue
            if i and LIBRES.search(i["licence"]): choisi = (c, i); break
        if not choisi: manquants.append(iso); print(iso, "aucun enregistrement libre", [c for c, _ in candidats[:3]]); continue
        titre_fichier, i = choisi
        brut = SORTIE / f"{iso}.source"
        brut.write_bytes(get(i["url"]))
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(brut),
                            "-af", "atrim=0:100,loudnorm=I=-18:TP=-1.5,areverse,afade=t=in:d=3,areverse",
                            "-ac", "1", "-ar", "48000", "-b:a", "40k", "-map_metadata", "-1", str(SORTIE / f"{iso}.mp3")])
        brut.unlink()
        if r.returncode: manquants.append(iso); print(iso, "conversion impossible"); continue
        lignes[iso] = {"iso3": iso, "pays": noms[iso], "hymne": e["titre"], "fichier_commons": titre_fichier,
                       "auteur": i["auteur"].replace("\n", " "), "licence": i["licence"], "page": i["page"]}
        print(iso, "ok", i["licence"], titre_fichier)
    for iso in list(lignes):  # un hymne refait mais introuvable ne garde pas l'ancien fichier faux
        if iso not in gardees and iso in manquants: lignes.pop(iso)
    for iso in isos:
        if iso not in lignes and (SORTIE / f"{iso}.mp3").exists(): (SORTIE / f"{iso}.mp3").unlink()
    ordre = [lignes[i] for i in isos if i in lignes]
    with open(csv_existant, "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=list(ordre[0].keys()), delimiter=";"); w.writeheader(); w.writerows(ordre)
    (RACINE / "src" / "data" / "hymnes.json").write_text(json.dumps({l["iso3"]: l["hymne"] for l in ordre}, ensure_ascii=False, indent=0), "utf8")
    print(f"{len(ordre)} hymnes, {len(manquants)} manquants : {' '.join(manquants)}")


if __name__ == "__main__":
    main()
