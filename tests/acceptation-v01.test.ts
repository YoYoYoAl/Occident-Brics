// Tests d'acceptation de la v0.1 (squelette).
import donnees from "../src/data/pays2000.json";
import monde from "world-atlas/countries-50m.json";
import { NB_ROUNDS, date, ere, libelle, ERES } from "../src/moteur/temps";
import { suivant } from "../src/moteur/alea";
import { creerEtat, avancer, estTermine, type EtatJeu } from "../src/moteur/etat";
import { serialiser, charger } from "../src/moteur/sauvegarde";
import { FAMILLES } from "../src/data/attributs";

const jouer = (e: EtatJeu, n: number) => { for (let i = 0; i < n; i++) e = avancer(e); return e; };

describe("M1 Données de départ", () => {
  it("contient 194 pays distincts (les 50 du jeu, puis les autres membres de l'ONU), tous présents sur la carte sauf Tuvalu", () => {
    expect(donnees.pays).toHaveLength(194);
    expect(new Set(donnees.pays.map(p => p.iso3)).size).toBe(194);
    const ids = new Set((monde as any).objects.countries.geometries.map((g: any) => g.id));
    expect(donnees.pays.filter(p => !ids.has(p.idCarte)).map(p => p.iso3)).toEqual(["TUV"]); // absent de la carte 1:50m
  });
  it("n'invente aucune valeur : chaque indicateur est un nombre positif ou nul issu des sources, ou null", () => {
    for (const p of donnees.pays) for (const [k, v] of Object.entries(p.indicateurs)) {
      if (v !== null) expect(v, `${p.iso3}.${k}`).toBeGreaterThanOrEqual(0);
    }
    expect(Object.keys(donnees.sources)).toEqual(["owid_co2", "owid_energie", "estimation"]); // estimation : PIB de 32 petits pays, listés dans trajectoires.json
  });
  it("donne des valeurs 2000 cohérentes avec les ordres de grandeur connus", () => {
    const pop = (iso: string) => donnees.pays.find(p => p.iso3 === iso)!.indicateurs.population! / 1e6;
    expect(pop("USA")).toBeGreaterThan(270); expect(pop("USA")).toBeLessThan(290);
    expect(pop("CHN")).toBeGreaterThan(1240); expect(pop("CHN")).toBeLessThan(1300);
    expect(pop("IND")).toBeGreaterThan(1000); expect(pop("IND")).toBeLessThan(1100);
  });
  it("définit 30 attributs en 5 familles", () => {
    expect(Object.keys(FAMILLES)).toHaveLength(5);
    expect(Object.values(FAMILLES).reduce((n, f) => n + f.attributs.length, 0)).toBe(30);
  });
});

describe("M2 Temps trimestriel", () => {
  it("couvre 2000 T1 à 2050 T4, soit 204 rounds", () => {
    expect(NB_ROUNDS).toBe(204);
    expect(libelle(0)).toBe("2000 T1");
    expect(libelle(NB_ROUNDS - 1)).toBe("2050 T4");
    expect(() => date(NB_ROUNDS)).toThrow();
  });
  it("rattache chaque round à une seule ère, sans trou", () => {
    expect(ere(0).numero).toBe(1);
    expect(ere(4 * 8).numero).toBe(2);   // 2008 T1
    expect(ere(4 * 20).numero).toBe(3);  // 2020 T1
    expect(ere(4 * 35).numero).toBe(4);  // 2035 T1
    for (let i = 1; i < ERES.length; i++) expect(ERES[i].debut).toBe(ERES[i - 1].fin + 1);
  });
  it("même graine = même suite aléatoire ; graines différentes = suites différentes", () => {
    const suite = (g: number) => { const r: number[] = []; let e = g; for (let i = 0; i < 100; i++) { const s = suivant(e); r.push(s.valeur); e = s.etat; } return r; };
    expect(suite(42)).toEqual(suite(42));
    expect(suite(42)).not.toEqual(suite(43));
    expect(suite(7).every(v => v >= 0 && v < 1)).toBe(true);
  });
  it("même graine = état identique après une partie complète", () => {
    const a = jouer(creerEtat(1234), NB_ROUNDS), b = jouer(creerEtat(1234), NB_ROUNDS);
    expect(serialiser(a)).toBe(serialiser(b));
    expect(estTermine(a)).toBe(true);
    expect(a.round).toBe(NB_ROUNDS - 1);
  });
  it("joue les 204 rounds en moins de 30 secondes", () => {
    const t0 = performance.now();
    jouer(creerEtat(1), NB_ROUNDS);
    expect(performance.now() - t0).toBeLessThan(30000);
  });
  it("applique la tendance démographique 1995-2000 sans dériver", () => {
    const e = jouer(creerEtat(1), 4);
    const usa = donnees.pays.find(p => p.iso3 === "USA")!;
    expect(e.pays.USA.population / usa.indicateurs.population!).toBeCloseTo(1 + usa.croissancePop9500!, 10);
  });
});

describe("M11 Sauvegarde", () => {
  it("sauver, charger puis jouer 100 rounds = partie sans interruption", () => {
    const debut = jouer(creerEtat(99), 50);
    const repris = jouer(charger(serialiser(debut)), 100);
    const continu = jouer(creerEtat(99), 150);
    expect(serialiser(repris)).toBe(serialiser(continu));
  });
  it("refuse une sauvegarde d'une autre version ou corrompue", () => {
    expect(() => charger(JSON.stringify({ ...creerEtat(1), version: 0 }))).toThrow();
    expect(() => charger("{}")).toThrow();
    expect(() => charger("pas du json")).toThrow();
  });
});
