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
    time.sleep(0.5)  # politesse envers l'API
    return json.loads(get("https://commons.wikimedia.org/w/api.php", {**params, "format": "json"}))


def wikidata(isos):
    valeurs = " ".join(f'"{i}"' for i in isos)
    q = f"""SELECT ?iso ?hymneLabel ?audio ?paysEn WHERE {{
      VALUES ?iso {{ {valeurs} }} ?pays wdt:P298 ?iso.
      OPTIONAL {{ ?pays rdfs:label ?paysEn FILTER(lang(?paysEn) = "en") }}
      OPTIONAL {{ ?pays wdt:P85 ?hymne. OPTIONAL {{ ?hymne wdt:P51 ?audio. }} }}
      SERVICE wikibase:label {{ bd:serviceParam wikibase:language "fr,en". }} }}"""
    d = json.loads(get("https://query.wikidata.org/sparql", {"query": q, "format": "json"}))
    res = {}
    for b in d["results"]["bindings"]:
        iso = b["iso"]["value"]; e = res.setdefault(iso, {"titre": "", "audios": [], "en": ""})
        if "hymneLabel" in b and not e["titre"]: e["titre"] = b["hymneLabel"]["value"]
        if "paysEn" in b: e["en"] = b["paysEn"]["value"]
        if "audio" in b:
            nom = "File:" + urllib.parse.unquote(b["audio"]["value"].rsplit("/", 1)[-1]).replace("_", " ")
            if nom not in e["audios"]: e["audios"].append(nom)
    return res


def recherche_navy(en):
    d = commons({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 10,
                 "srsearch": f'intitle:"Navy Band" {en} anthem'})
    return [r["title"] for r in d["query"]["search"] if AUDIO.search(r["title"]) and en.split()[0].lower() in r["title"].lower()]


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
    wd = {}
    for k in range(0, len(isos), 50): wd.update(wikidata(isos[k:k + 50])); time.sleep(1)
    SORTIE.mkdir(parents=True, exist_ok=True)
    lignes, manquants = [], []
    for iso in isos:
        e = wd.get(iso, {"titre": "", "audios": [], "en": ""})
        candidats = sorted(e["audios"], key=preference)
        if not any("navy band" in c.lower() for c in candidats) and e["en"]:
            try: candidats = sorted(recherche_navy(e["en"]), key=preference) + candidats
            except Exception as err: print(iso, "recherche", err, file=sys.stderr)
        choisi = None
        for c in candidats:
            i = infos(c)
            if i and LIBRES.search(i["licence"]): choisi = (c, i); break
        if not choisi: manquants.append(iso); print(iso, "aucun enregistrement libre", candidats[:3]); continue
        titre_fichier, i = choisi
        brut = SORTIE / f"{iso}.source"
        brut.write_bytes(get(i["url"]))
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(brut),
                            "-af", "atrim=0:100,loudnorm=I=-18:TP=-1.5,areverse,afade=t=in:d=3,areverse",
                            "-ac", "1", "-ar", "48000", "-b:a", "40k", "-map_metadata", "-1", str(SORTIE / f"{iso}.mp3")])
        brut.unlink()
        if r.returncode: manquants.append(iso); print(iso, "conversion impossible"); continue
        lignes.append({"iso3": iso, "pays": noms[iso], "hymne": e["titre"], "fichier_commons": titre_fichier,
                       "auteur": i["auteur"], "licence": i["licence"], "page": i["page"]})
        print(iso, "ok", i["licence"], titre_fichier)
    with open(SORTIE / "hymnes.csv", "w", newline="", encoding="utf8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()), delimiter=";"); w.writeheader(); w.writerows(lignes)
    (RACINE / "src" / "data" / "hymnes.json").write_text(json.dumps({l["iso3"]: l["hymne"] for l in lignes}, ensure_ascii=False, indent=0), "utf8")
    print(f"{len(lignes)} hymnes, {len(manquants)} manquants : {' '.join(manquants)}")


if __name__ == "__main__":
    main()
