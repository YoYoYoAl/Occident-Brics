// Tests d'acceptation de l'extension « tous les pays de l'ONU » (donnees/monde, générées par les outils du dossier outils/).
import monde from "world-atlas/countries-50m.json";
import p50 from "../src/data/pays2000.json";
import a50 from "../src/data/attributs2000.json";
import s50 from "../src/data/scores2000.json";
import { FAMILLES } from "../src/data/attributs";
import paysM from "../donnees/monde/pays2000.json";
import attrM from "../donnees/monde/attributs2000.json";
import scoresM from "../donnees/monde/scores2000.json";
import trajM from "../donnees/monde/trajectoires.json";
import inflM from "../donnees/monde/influence2000_monde.json";
import compM from "../donnees/monde/complements2000.json";
import listeM from "../outils/pays_monde.json";

type Camp = { p: number; m: number; c: number; commerce: number };
const A = attrM as unknown as { indicateurs: Record<string, unknown>; pays: Record<string, { nom: string; valeurs: Record<string, { v: number; e?: number } | null> }> };
const S = scoresM as unknown as { attributs: Record<string, { ajustements: Record<string, string> }>; pays: Record<string, { scores: Record<string, number> }> };
const T = trajM as unknown as { anneeDebut: number; anneeFin: number; pays: Record<string, Record<"pib" | "population" | "co2", (number | null)[]>>; estimations: Record<string, Record<string, string>> };
const INF = (inflM as unknown as { pays: Record<string, { OCC: Camp; CHN: Camp; raison: string }> }).pays;
const C = compM as unknown as Record<string, unknown> & { reconnaissentTaiwan2000: string[] };
const NOUVEAUX = Object.keys(listeM);
const ANCIENS = p50.pays.map(p => p.iso3);
const TOUS = paysM.pays.map(p => p.iso3);
const v = (iso: string, k: string) => A.pays[iso].valeurs[k]?.v ?? null;
const sc = (iso: string, a: string) => S.pays[iso].scores[a];
const ATTRIBUTS = Object.values(FAMILLES).flatMap(f => f.attributs);

describe("Extension 1 : liste des pays", () => {
  it("compte 194 pays distincts : 193 membres de l'ONU et Taïwan, les 50 du jeu en tête", () => {
    expect(TOUS).toHaveLength(194);
    expect(new Set(TOUS).size).toBe(194);
    expect(TOUS.slice(0, 50)).toEqual(ANCIENS);
    expect(NOUVEAUX).toHaveLength(144);
    expect(NOUVEAUX.filter(i => ANCIENS.includes(i))).toEqual([]);
  });
  it("utilise la même liste dans tous les fichiers (influence : les 144 nouveaux)", () => {
    const tri = [...TOUS].sort();
    expect(Object.keys(A.pays).sort()).toEqual(tri);
    expect(Object.keys(S.pays).sort()).toEqual(tri);
    expect(Object.keys(T.pays).sort()).toEqual(tri);
    expect(Object.keys(INF).sort()).toEqual([...NOUVEAUX].sort());
  });
  it("place chaque nouveau pays sur la carte (sauf Tuvalu, absent de Natural Earth 1:50m)", () => {
    const ids = new Set((monde as any).objects.countries.geometries.map((g: any) => g.id));
    const absents = paysM.pays.filter(p => !ids.has(p.idCarte)).map(p => p.iso3);
    expect(absents).toEqual(["TUV"]);
  });
});

describe("Extension 2 : les 50 pays du jeu ne changent pas", () => {
  it("garde à l'identique leurs indicateurs de pays2000.json", () => {
    expect(paysM.pays.slice(0, 50)).toEqual(p50.pays);
  });
  it("garde à l'identique leurs 73 indicateurs et leurs 30 scores", () => {
    const a = a50 as unknown as typeof A, s = s50 as unknown as typeof S;
    for (const i of ANCIENS) {
      expect(A.pays[i].valeurs, i).toEqual(a.pays[i].valeurs);
      expect(S.pays[i], i).toEqual(s.pays[i]);
    }
    for (const at of ATTRIBUTS) for (const [i, r] of Object.entries(s.attributs[at].ajustements)) expect(S.attributs[at].ajustements[i], at + i).toBe(r);
  });
});

describe("Extension 3 : données 2000 des 144 pays", () => {
  it("donne population, PIB et CO2 2000 à tous, les PIB et CO2 complétés étant listés comme estimations", () => {
    for (const p of paysM.pays) {
      expect(p.indicateurs.population, p.iso3).toBeGreaterThan(9000);
      expect(p.indicateurs.pib, p.iso3).toBeGreaterThan(0);
      expect(p.indicateurs.co2, p.iso3).toBeGreaterThan(0);
    }
    const estimes = paysM.pays.filter(p => "estimations" in p).map(p => p.iso3).sort();
    expect(estimes).toEqual(Object.keys(T.estimations).sort());
    expect(estimes.filter(i => ANCIENS.includes(i))).toEqual([]);
  });
  it("renseigne les mêmes indicateurs que pour les 50 pays, avec au plus 15 % de valeurs manquantes", () => {
    expect(Object.keys(A.indicateurs)).toEqual(Object.keys((a50 as any).indicateurs));
    let n = 0, manque = 0;
    for (const i of NOUVEAUX) for (const k of Object.keys(A.indicateurs)) { n++; if (v(i, k) === null) manque++; }
    expect(manque / n).toBeLessThan(0.15);
  });
  it("donne 7 parts de religions dont la somme vaut 100 % (à 2 points près) pour les 194 pays", () => {
    const cles = ["chretiens", "musulmans", "sansReligion", "hindous", "bouddhistes", "autresReligions", "juifs"];
    for (const i of TOUS) expect(Math.abs(cles.reduce((s, k) => s + (v(i, k) ?? NaN), 0) - 100), i).toBeLessThanOrEqual(2);
  });
  it("marque comme estimation les indices naval, aérien et cyber de tous les pays", () => {
    for (const i of TOUS) for (const k of ["indiceNaval", "indiceAerien", "indiceCyber"]) expect(A.pays[i].valeurs[k]?.e, i + k).toBe(1);
  });
  it("garde des ordres de grandeur plausibles", () => {
    expect(v("SWE", "indiceCyber")!).toBeGreaterThan(v("TUV", "indiceCyber")!);
    expect(v("GRC", "indiceNaval")!).toBeGreaterThan(v("CHE", "indiceNaval")!);
    expect(v("ALB", "stockChimique")).toBe(17);  // seul nouveau pays avec un stock déclaré à l'OIAC
    expect(v("NGA", "population")!).toBeGreaterThan(v("GHA", "population")!);
  });
});

describe("Extension 4 : scores des 30 attributs", () => {
  it("donne un score entier de 0 à 100 à chaque attribut des 194 pays", () => {
    for (const i of TOUS) for (const a of ATTRIBUTS) {
      const x = sc(i, a);
      expect(Number.isInteger(x) && x >= 0 && x <= 100, `${i} ${a} = ${x}`).toBe(true);
    }
  });
  it("explique chaque correction", () => {
    for (const a of ATTRIBUTS) for (const r of Object.values(S.attributs[a].ajustements)) expect(r.length, a).toBeGreaterThan(3);
  });
  it("classe les nouveaux pays de façon réaliste", () => {
    expect(sc("KWT", "Énergie")).toBeGreaterThan(sc("BEL", "Énergie"));
    expect(sc("CHE", "Gestion")).toBeGreaterThan(sc("SOM", "Gestion"));
    expect(sc("SWE", "Infrastructure")).toBeGreaterThan(sc("NER", "Infrastructure"));
    expect(sc("NER", "Fertilité")).toBeGreaterThan(sc("ITA", "Fertilité"));
    expect(sc("SYR", "Chimique")).toBeGreaterThan(sc("NZL", "Chimique"));
    expect(sc("GRC", "Naval")).toBeGreaterThan(sc("AUT", "Naval"));
    expect(sc("USA", "Puissance financière")).toBeGreaterThan(sc("CHE", "Puissance financière"));
    expect(sc("KWT", "Eau")).toBeLessThan(20);
  });
});

describe("Extension 5 : trajectoires 2000-2022", () => {
  it("couvre 23 années de PIB, population et CO2 pour les 194 pays, sans année 2000 vide", () => {
    expect([T.anneeDebut, T.anneeFin]).toEqual([2000, 2022]);
    for (const i of TOUS) for (const k of ["pib", "population", "co2"] as const) {
      expect(T.pays[i][k], i + k).toHaveLength(23);
      expect(T.pays[i][k][0], i + k).toBeGreaterThan(0);
    }
  });
  it("part des valeurs 2000 de pays2000.json", () => {
    for (const p of paysM.pays) {
      expect(T.pays[p.iso3].pib[0], p.iso3).toBeCloseTo(p.indicateurs.pib!, -3);
      expect(T.pays[p.iso3].population[0], p.iso3).toBe(p.indicateurs.population);
    }
  });
  it("ne montre aucun saut annuel du PIB au-delà de -60 % / +100 % (hors guerres connues)", () => {
    const guerres = ["LBY", "SSD", "YEM", "SYR", "LBN", "IRQ", "GNQ"];
    for (const i of NOUVEAUX.filter(x => !guerres.includes(x))) {
      const s = T.pays[i].pib;
      for (let k = 1; k < s.length; k++) if (s[k] && s[k - 1]) {
        const r = s[k]! / s[k - 1]!;
        expect(r > 0.4 && r < 2, `${i} ${2000 + k} : ${r.toFixed(2)}`).toBe(true);
      }
    }
  });
});

describe("Extension 6 : influence de départ et compléments", () => {
  it("donne des influences de 0 à 100 et un multiplicateur commercial de 0 à 2", () => {
    for (const [i, d] of Object.entries(INF)) for (const c of [d.OCC, d.CHN]) {
      for (const k of ["p", "m", "c"] as const) expect(c[k] >= 0 && c[k] <= 100, i).toBe(true);
      expect(c.commerce > 0 && c.commerce <= 2, i).toBe(true);
      expect(d.raison.length, i).toBeGreaterThan(3);
    }
  });
  it("reflète les alignements de 2000", () => {
    for (const i of ["BEL", "DNK", "GRC", "PRT", "CZE", "HUN", "JOR", "KWT", "NZL"]) expect(INF[i].OCC.p, i).toBeGreaterThan(INF[i].CHN.p + 40);
    for (const i of ["MMR", "SDN", "LAO", "KHM"]) expect(INF[i].CHN.p, i).toBeGreaterThan(INF[i].OCC.p);
    for (const i of C.reconnaissentTaiwan2000) expect(INF[i].CHN.p, i).toBeLessThanOrEqual(3);
  });
  it("n'emploie que des codes de la liste des 144 pays dans les compléments", () => {
    const codes = JSON.stringify(compM).match(/"[A-Z]{3}"/g)!.map(s => s.slice(1, 4)).filter(s => !["OCC", "CHN", "OTAN", "OPEP", "CEI"].includes(s));
    for (const c of codes) expect(NOUVEAUX, c).toContain(c);
  });
});
