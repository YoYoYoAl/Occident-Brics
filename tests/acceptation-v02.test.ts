// Tests d'acceptation de la v0.2 : données réelles 2000 des 30 attributs (module M1 bis).
import { DONNEES, valeur, indicateursDe, formater } from "../src/data/donnees2000";
import { FAMILLES } from "../src/data/attributs";
import v01 from "../src/data/pays2000.json";
import { ficheHtml } from "../src/interface/fiche";
import { creerEtat } from "../src/moteur/etat";

const ISO = Object.keys(DONNEES.pays);
const CLES = Object.keys(DONNEES.indicateurs);
const v = (iso: string, cle: string) => valeur(iso, cle)?.v ?? null;

describe("M1b Catalogue des indicateurs", () => {
  it("couvre les 50 pays de la v0.1, et eux seuls", () => {
    expect(ISO.sort()).toEqual(v01.pays.map(p => p.iso3).sort());
  });
  it("rattache chaque indicateur à une famille et à un attribut existants", () => {
    for (const k of CLES) {
      const d = DONNEES.indicateurs[k];
      const fam = FAMILLES[d.famille as keyof typeof FAMILLES];
      expect(fam, k).toBeDefined();
      expect(["Ensemble", ...fam.attributs], k).toContain(d.attribut);
    }
  });
  it("donne à chacun des 30 attributs au moins un indicateur, ou la raison de son absence (jamais les deux)", () => {
    let n = 0;
    for (const [cf, fam] of Object.entries(FAMILLES)) for (const a of fam.attributs) {
      n++;
      const aIndicateur = indicateursDe(cf, a).length > 0, aRaison = a in DONNEES.sansSource;
      expect(aIndicateur !== aRaison, a).toBe(true);
    }
    expect(n).toBe(30);
    expect(Object.keys(DONNEES.sansSource)).toEqual([]);
  });
  it("cite une source connue pour chaque indicateur et chaque valeur complétée", () => {
    for (const k of CLES) expect(DONNEES.sources[DONNEES.indicateurs[k].source], k).toBeDefined();
    for (const iso of ISO) for (const k of CLES) {
      const val = valeur(iso, k);
      if (val?.s) { expect(DONNEES.sources[val.s], `${iso}.${k}`).toBeDefined(); expect(val.c).toBeTruthy(); }
    }
  });
});

describe("M1b Valeurs : aucune donnée inventée", () => {
  it("chaque valeur est un nombre fini daté dans la fenêtre 2000 ± 3 ans, ou null", () => {
    for (const iso of ISO) for (const k of CLES) {
      const val = valeur(iso, k);
      if (val === null) continue;
      expect(Number.isFinite(val.v), `${iso}.${k}`).toBe(true);
      if (val.e) expect(DONNEES.indicateurs[k].note, k).toMatch(/^ESTIMATION/); // seules estimations admises, signalées
      else expect(Math.abs(val.a - 2000), `${iso}.${k}`).toBeLessThanOrEqual(DONNEES.fenetre);
    }
  });
  it("respecte les bornes de chaque unité", () => {
    const bornes: [RegExp, number, number][] = [
      [/^-2,5 à \+2,5$/, -2.6, 2.6], [/^0 à 1$/, 0, 1], [/^0 à 100$/, 0, 100], [/^1 = oui/, 0, 1],
      [/^% de la population$/, 0, 100], [/^% de la superficie$/, 0, 100], [/^années$/, 0, 90],
    ];
    for (const k of CLES) {
      const u = DONNEES.indicateurs[k].unite, b = bornes.find(([r]) => r.test(u));
      const binaire = u.startsWith("1 = oui");
      for (const iso of ISO) {
        const x = v(iso, k);
        if (x === null) continue;
        if (b) { expect(x, `${iso}.${k}`).toBeGreaterThanOrEqual(b[1]); expect(x, `${iso}.${k}`).toBeLessThanOrEqual(b[2]); }
        if (binaire) expect([0, 1], `${iso}.${k}`).toContain(x);
        const signe = k === "importsEnergie" || k === "inflation" || u === "-2,5 à +2,5"; // seules grandeurs pouvant être négatives
        if (!signe) expect(x, `${iso}.${k}`).toBeGreaterThanOrEqual(0);
      }
    }
  });
  it("ne garde aucun 0 publié là où 0 est impossible (comptes nationaux du Venezuela)", () => {
    for (const iso of ISO) for (const k of ["exportations", "commercePib", "agriPib", "pibNominal", "population", "superficie"])
      expect(v(iso, k), `${iso}.${k}`).not.toBe(0);
    expect(valeur("VEN", "exportations")).toBeNull();
  });
  it("couvre au moins 90 % des cases pour les indicateurs de base", () => {
    for (const k of ["population", "esperanceVie", "fecondite", "pibPpa", "co2", "efficaciteGouv", "depensesMil", "ogives", "forets"]) {
      const n = ISO.filter(iso => valeur(iso, k) !== null).length;
      expect(n, k).toBeGreaterThanOrEqual(45);
    }
  });
});

describe("M1b Cohérence avec des faits connus de 2000", () => {
  it("concorde avec la population de la v0.1 (sources indépendantes) à 3 % près", () => {
    for (const p of v01.pays) {
      const a = v(p.iso3, "population"), b = p.indicateurs.population;
      if (a && b) expect(Math.abs(a / b - 1), p.iso3).toBeLessThan(0.03);
    }
  });
  it("retrouve les ordres de grandeur économiques (PIB nominal en milliers de milliards de $)", () => {
    const pib = (iso: string) => v(iso, "pibNominal")! / 1e12;
    expect(pib("USA")).toBeGreaterThan(9.5); expect(pib("USA")).toBeLessThan(11);
    expect(pib("JPN")).toBeGreaterThan(4.5); expect(pib("JPN")).toBeLessThan(5.5);
    expect(pib("CHN")).toBeGreaterThan(1.0); expect(pib("CHN")).toBeLessThan(1.4);
  });
  it("classe les États-Unis premiers en dépenses militaires, avec plus du tiers des 50 pays", () => {
    const d = ISO.map(iso => [iso, v(iso, "depensesMil") ?? 0] as const).sort((a, b) => b[1] - a[1]);
    expect(d[0][0]).toBe("USA");
    expect(d[0][1] / d.reduce((s, x) => s + x[1], 0)).toBeGreaterThan(1 / 3);
    expect(v("PAN", "depensesMil")).toBe(0); // Panama n'a plus d'armée depuis 1990
  });
  it("ne donne des ogives nucléaires qu'aux 8 puissances nucléaires de 2000", () => {
    const nucleaires = ISO.filter(iso => (v(iso, "ogives") ?? 0) > 0).sort();
    expect(nucleaires).toEqual(["CHN", "FRA", "GBR", "IND", "ISR", "PAK", "RUS", "USA"]);
    expect(v("RUS", "ogives")! + v("USA", "ogives")!).toBeGreaterThan(20000);
  });
  it("identifie les lanceurs orbitaux et les parties à la convention sur les armes chimiques", () => {
    expect(ISO.filter(iso => v(iso, "lanceurOrbital") === 1).sort()).toEqual(["CHN", "FRA", "GBR", "IND", "ISR", "JPN", "RUS", "UKR", "USA"]);
    for (const iso of ["EGY", "ISR", "PRK", "IRQ", "THA", "COD"]) expect(v(iso, "partieCiac"), iso).toBe(0); // non parties fin 2000
    expect(v("ARE", "partieCiac")).toBe(1); // entrée en vigueur le 28/12/2000
    expect(valeur("TWN", "partieCiac")).toBeNull();
    expect(v("RUS", "stockChimique")).toBe(40000);
  });
  it("donne à la Chine près de 90 % de la production de terres rares (USGS : 73 000 t sur 83 300)", () => {
    const total = ISO.reduce((s, iso) => s + (v(iso, "terresRares") ?? 0), 0);
    expect(v("CHN", "terresRares")).toBe(73000);
    expect(v("CHN", "terresRares")! / total).toBeGreaterThan(0.85);
    expect(valeur("RUS", "terresRares")).toBeNull(); // ex-URSS non répartie
  });
  it("retrouve les extrêmes démographiques et sanitaires connus", () => {
    expect(v("JPN", "esperanceVie")).toBeGreaterThan(80);
    expect(v("NGA", "fecondite")).toBeGreaterThan(5);
    expect(v("SGP", "urbanisation")).toBe(100);
    expect(v("TWN", "population")).toBeGreaterThan(22e6); // complément UN WPP via Our World in Data
    expect(valeur("TWN", "population")!.s).toBe("owid_co2");
  });
});

describe("M1b Religion (estimation 2000 demandée)", () => {
  const REL = indicateursDe("population", "Religion");
  it("donne 7 parts dont la somme vaut 100 % (à 2 points près) pour les 50 pays", () => {
    expect(REL).toHaveLength(7);
    for (const iso of ISO) {
      const somme = REL.reduce((s, k) => s + v(iso, k)!, 0);
      expect(Math.abs(somme - 100), iso).toBeLessThan(2);
      for (const k of REL) expect(valeur(iso, k)!.e, `${iso}.${k}`).toBe(1);
    }
  });
  it("retrouve les majorités religieuses connues", () => {
    const majeure = (iso: string) => REL.reduce((a, b) => (v(iso, a)! >= v(iso, b)! ? a : b));
    expect(majeure("IND")).toBe("hindous"); expect(majeure("ISR")).toBe("juifs"); expect(majeure("IDN")).toBe("musulmans");
    expect(majeure("BRA")).toBe("chretiens"); expect(majeure("CHN")).toBe("sansReligion"); expect(majeure("SAU")).toBe("musulmans");
  });
});

describe("M1b Estimations naval, aérien, cyber (demandées)", () => {
  const tri = (k: string) => ISO.filter(iso => v(iso, k) !== null).sort((a, b) => v(b, k)! - v(a, k)!);
  it("marque comme estimation toutes les valeurs des indices naval, aérien et cyber, pour les 50 pays", () => {
    for (const k of ["indiceNaval", "indiceAerien", "indiceCyber"]) {
      expect(DONNEES.indicateurs[k].note, k).toMatch(/^ESTIMATION/);
      for (const iso of ISO) { expect(valeur(iso, k)?.e, `${iso}.${k}`).toBe(1); expect(v(iso, k)!).toBeLessThanOrEqual(100); }
    }
  });
  it("place les États-Unis en tête et la Russie deuxième sur mer et dans les airs", () => {
    for (const k of ["indiceNaval", "indiceAerien"]) { expect(tri(k)[0], k).toBe("USA"); expect(tri(k)[1], k).toBe("RUS"); }
  });
  it("place les États-Unis en tête de l'indice cyber, les 5 puissances de rang 2 juste derrière", () => {
    expect(tri("indiceCyber")[0]).toBe("USA");
    expect(tri("indiceCyber").slice(1, 6).sort()).toEqual(["CHN", "FRA", "GBR", "ISR", "RUS"]);
  });
  it("garde les importations SIPRI comme données réelles, avec les grands importateurs connus", () => {
    expect(valeur("IND", "naviresImportes")!.e).toBeUndefined();
    expect(tri("naviresImportes").slice(0, 5)).toEqual(expect.arrayContaining(["IND", "TWN", "TUR"]));
    expect(tri("avionsImportes").slice(0, 5)).toEqual(expect.arrayContaining(["JPN", "IND", "SAU"]));
  });
});

describe("M1b Fiche pays", () => {
  it("affiche, pour chaque pays, les 30 attributs avec valeurs ou raison d'absence", () => {
    const e = creerEtat(1);
    for (const iso of ISO) {
      const html = ficheHtml(iso, e);
      for (const fam of Object.values(FAMILLES)) for (const a of fam.attributs) expect(html, `${iso} ${a}`).toContain(`<td colspan="2">${a}</td>`);
      expect(html).not.toContain("undefined");
    }
    expect(ficheHtml("CHN", e)).toContain("(estimation)");
  });
  it("formate les valeurs en français", () => {
    expect(formater("partieCiac", 1)).toBe("oui");
    expect(formater("esperanceVie", 76.64)).toBe("76,64");
  });
});
