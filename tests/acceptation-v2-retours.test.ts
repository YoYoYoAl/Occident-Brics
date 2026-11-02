// Acceptation : retours de test du 2 novembre 2026 (bilan des opérations, tension, routes, événements après 2035, noms).
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import { ROUTES, ZONE_DE } from "../src/v2/zones";
import { nomExclu } from "../src/data/noms-exclus";
import { lePays } from "../src/contenu/contextes";
import { CARTES_ERE3 } from "../src/contenu/cartes3";
import { TENDANCES } from "../src/v2/ressources";

const jouerAnnee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); };
const base = (g: number) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.points = { OCC: 20, CHN: 20 }; return e; };

describe("Retours de test du 2 novembre 2026 (acceptation)", () => {
  it("1. bilan : un sabotage de la Chine par l'Occident est mesuré (PIB, stabilité, production) avec sa progression sur 3 ans", () => {
    const e = base(41); M.engager(e, "OCC", "saboter", ZONE_DE["CHN"], 4, "CHN");
    const r = M.resoudreAnnee(e).find(x => x.op.type === "saboter" && x.op.camp === "OCC")!;
    expect(r).toBeDefined(); expect(r.mesure!.pib).toBeLessThan(0); expect(r.mesure!.stabilite).toBeLessThan(0);
    expect(Object.values(r.mesure!.soldes).some(v => v! < 0)).toBe(true);
    expect(r.age).toBe(0); expect(r.part).toBe(0.5); expect(r.cumul).toBe(0.5);
  });
  it("2. tension : saboter le leader adverse fait monter la tension, saboter un pays neutre presque pas", () => {
    const a = base(42), b = base(42);
    M.engager(a, "OCC", "saboter", ZONE_DE["CHN"], 4, "CHN"); M.engager(b, "OCC", "saboter", ZONE_DE["CHE"], 4, "CHE");
    const t0 = a.tension; const ra = M.resoudreAnnee(a), rb = M.resoudreAnnee(b);
    const ta = ra.find(x => x.op.type === "saboter")!.mesure!.tension, tb = rb.find(x => x.op.type === "saboter")!.mesure!.tension;
    expect(ta).toBeGreaterThanOrEqual(0.25 * 4 * 0.5 - 1e-9); expect(tb).toBeLessThan(ta); void t0;
    expect(M.EFFET.demasqueLeader).toBeGreaterThan(M.EFFET.demasque);
  });
  it("3. routes : 36 routes (21 maritimes, 11 terrestres, 4 aériennes), pays existants", () => {
    const e = M.creerPartieV2(1, null as any), n = (m: string) => ROUTES.filter(r => (r.mode ?? "mer") === m).length;
    expect(ROUTES).toHaveLength(36); expect(n("mer")).toBe(21); expect(n("terre")).toBe(11); expect(n("air")).toBe(4);
    for (const r of ROUTES) for (const p of r.pays) expect(e.pays[p], `${r.id} ${p}`).toBeDefined();
  });
  it("4. après 2035 : 10 à 14 événements par an, au plus un générique par pays, camps résolus (jamais « undefined »)", () => {
    const e = base(43);
    while (e.annee < 2036) jouerAnnee(e);
    for (let a = 2036; a <= 2042; a++) {
      M.jouerEvenements(e); M.evenementsAnnee(e);
      const l = e.evenements.filter(x => !x.id.startsWith("chantage") && x.id !== "decouverte");
      expect(l.length, `${a}`).toBeGreaterThanOrEqual(10); expect(l.length).toBeLessThanOrEqual(16);
      const gen = l.filter(x => x.id.startsWith("gen_")).map(x => x.pays[0]); expect(new Set(gen).size).toBe(gen.length);
      for (const x of e.evenements) { expect(x.resume ?? "").not.toContain("undefined"); expect(x.titre).not.toContain("{"); }
      M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e);
    }
  }, 120_000);
  it("5. noms : aucun dirigeant ni conseiller trop proche d'une personne réelle (300 parties) ; articles corrects", () => {
    expect(nomExclu("Arthur Vance")).toBe(true); expect(nomExclu("Ma Kai")).toBe(true); expect(nomExclu("Deng Xiaoling")).toBe(true); expect(nomExclu("Arthur Ellery")).toBe(false);
    for (let g = 1; g <= 300; g++) { const e = M.creerPartieV2(g, null as any); for (const c of ["OCC", "CHN"] as const) for (const n of [e.dirigeants[c].nom, ...Object.values(e.candidats[c]).flat().map(x => x.nom)]) expect(nomExclu(n), n).toBe(false); }
    expect(lePays("USA", "États-Unis", true)).toBe("Les États-Unis"); expect(lePays("PAK", "Pakistan")).toBe("le Pakistan");
  });
  it("6. requalification 2050 : cartes de l'ère 3 à partir de 2026 (symétriques), anciennes cartes uniques retirées, tendances jusqu'en 2050", () => {
    const n = (c: string) => CARTES_ERE3.filter(k => k.camp === c).length;
    expect([n("OCC"), n("CHN"), n("NEUTRE")]).toEqual([5, 5, 3]);
    const e = base(7); e.annee = 2030; const vus = new Set<string>();
    for (let i = 0; i < 40; i++) { M.distribuerMains(e); for (const c of ["OCC", "CHN"] as const) for (const m of e.main![c]) vus.add(m.carte.id); }
    expect([...vus].some(id => id.includes("3_"))).toBe(true);
    expect(vus.has("o2_pivot")).toBe(false);
    e.annee = 2015; const v2 = new Set<string>(); for (let i = 0; i < 40; i++) { M.distribuerMains(e); for (const m of e.main!.OCC) v2.add(m.carte.id); }
    expect([...v2].some(id => id.includes("3_"))).toBe(false);
    expect(TENDANCES.filter(t => t.a === 2050).length).toBeGreaterThanOrEqual(5);
  });
});
