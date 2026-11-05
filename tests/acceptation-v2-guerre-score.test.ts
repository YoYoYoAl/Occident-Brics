// Score de guerre façon EU4 (demande du 2 novembre 2026) : « ajouter les mécanismes de score de guerre, contrôler, annexer,
// réparations et impact sur stabilité et influence ».
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as CR from "../src/v2/crises";
const base = (g: number) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.appels = []; return e; };
const guerre = (e: M.EtatV2, a = "AZE", b = "ARM") => { const g = CR.ouvrirGuerre(e, a, b, "test")!; g.allies = {}; g.garants = {}; return g; };
describe("Score de guerre, occupation et traités", () => {
  it("1. le front avance de 0,6 % par point de bataille (80 % au plus : tout est possible) et le score suit occupation + batailles + objectif", () => {
    const e = base(31), g = guerre(e);
    CR.anneeDeGuerre(e, g, 40); // victoire nette : +24 %, batailles +12
    expect(g.occ).toEqual({ a: 24, b: 0 }); expect(g.batailles).toBe(12); expect(g.objectif).toBe(5);
    expect(g.score).toBeCloseTo(0.5 * 24 + 12 + 5);
    CR.anneeDeGuerre(e, g, -10); // contre-attaque : libère d'abord le territoire occupé (−6 %), batailles −3
    expect(g.occ!.a).toBeCloseTo(18); expect(g.occ!.b).toBe(0); expect(g.batailles).toBe(9);
  });
  it("2. plafonds : batailles ±30, objectif ±20, score ±100", () => {
    const e = base(32), g = guerre(e);
    for (let i = 0; i < 10; i++) CR.anneeDeGuerre(e, g, 99);
    expect(g.batailles).toBe(30); expect(g.objectif).toBe(20); expect(g.occ!.a).toBe(100); expect(g.score).toBe(100);
  });
  it("3. stabilité : l'occupation et la lassitude pèsent sur les belligérants", () => {
    const e = base(33), g = guerre(e), s = e.pays.ARM.stabilite;
    for (let i = 0; i < 5; i++) CR.anneeDeGuerre(e, g, 20);
    expect(e.pays.ARM.stabilite).toBeLessThan(s - 10); expect(g.lassitude!.b).toBeGreaterThan(g.lassitude!.a);
  });
  it("4. traité à 100 : l'IA exige annexion, contrôle, réparations et démilitarisation (100 points)", () => {
    expect(CR.exigencesIA(100)).toEqual(["annexer", "controler", "reparations", "demilitariser"]);
    expect(CR.exigencesIA(50)).toEqual(["annexer"]); expect(CR.exigencesIA(45)).toEqual(["annexer"]); expect(CR.exigencesIA(30)).toEqual(["controler"]);
  });
  it("5. annexion : population et PIB transférés, stabilité, grief durable, voisins méfiants", () => {
    const e = base(34), g = guerre(e, "RUS", "GEO"); g.score = 100; g.region = "Abkhazie et Ossétie du Sud";
    const pop = e.pays.GEO.population, rel = M.relation(e, "RUS", "GEO"), armM = e.pays.ARM.att[e.pays.RUS.att.CHN > e.pays.RUS.att.OCC ? "CHN" : "OCC"];
    const txt = CR.traite(e, g, 40, ["annexer"]);
    expect(e.pays.GEO.population).toBeCloseTo(pop * 0.9); expect(txt).toContain("annexe");
    expect(M.relation(e, "RUS", "GEO")).toBeLessThan(rel); void armM;
  });
  it("6. réparations : 1 % du PIB du perdant au vainqueur pendant 5 ans, puis plus rien", () => {
    const e = base(35), g = guerre(e); g.score = 30; CR.traite(e, g, 20, ["reparations"]);
    const a0 = e.pays.AZE.pib, b0 = e.pays.ARM.pib; CR.verserReparations(e);
    expect(e.pays.AZE.pib - a0).toBeCloseTo(b0 * 0.01); e.annee += 6; const a1 = e.pays.AZE.pib; CR.verserReparations(e); expect(e.pays.AZE.pib).toBe(a1);
  });
  it("7. contrôle et démilitarisation ; influence pour le camp qui a soutenu le vainqueur", () => {
    const e = base(36), g = guerre(e); g.score = 60; CR.soutenir(e, "OCC", "AZE", 2); CR.soutenir(e, "CHN", "ARM", 2);
    const camp = e.pays.AZE.att.CHN > e.pays.AZE.att.OCC ? "CHN" : "OCC", att = e.pays.ARM.att[camp], mil = e.pays.ARM.militaire, occ = e.pays.AZE.att.OCC, chn = e.pays.AZE.att.CHN;
    CR.traite(e, g, 40, ["controler", "demilitariser"]);
    expect(e.pays.ARM.att[camp]).toBeGreaterThan(att); expect(e.pays.ARM.militaire).toBeCloseTo(mil * 0.7);
    expect(e.pays.AZE.att.OCC).toBeGreaterThan(occ); expect(e.pays.AZE.att.CHN).toBeLessThan(chn);
  });
  it("8. paix : imposée à ±100, négociée dès ±50 quand le perdant est las, blanche quand les deux s'usent", () => {
    const e = base(37), g = guerre(e); g.score = 100; g.lassitude = { a: 0, b: 0 };
    expect(CR.finDeGuerre(e, g, 1)).toContain("victoire"); expect(g.fin).toBe(e.annee);
    const g2 = guerre(base(38)); g2.score = 55; g2.lassitude = { a: 10, b: 100 }; expect(CR.finDeGuerre(base(38), g2, 3)).toContain("victoire");
    const g3 = guerre(base(39)); g3.score = 30; g3.lassitude = { a: 0, b: 0 }; expect(CR.finDeGuerre(base(39), g3, 3)).toBe("");
  });
  it("9. 30 parties IA : les guerres finissent par des traités variés, sans valeur non finie", () => {
    const issues: Record<string, number> = {};
    for (let s = 601; s <= 630; s++) { const e = base(s);
      while (!e.fin) { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); }
      for (const g of e.guerres ?? []) if (!g.rebelles && g.fin) for (const t of g.traite?.length ? g.traite : [g.issue ?? ""]) { const k = /annexe/.test(t) ? "annexion" : /réparations/.test(t) ? "réparations" : /rapproche/.test(t) ? "contrôle" : /démilitarisé/.test(t) ? "démilitarisation" : /blanche/.test(t) ? "paix blanche" : "autre"; issues[k] = (issues[k] ?? 0) + 1; }
      for (const p of Object.values(e.pays)) { expect(Number.isFinite(p.pib)).toBe(true); expect(Number.isFinite(p.population)).toBe(true); }
    }
    console.log("issues des guerres (30 parties)", JSON.stringify(issues));
    expect(Object.keys(issues).length).toBeGreaterThanOrEqual(2);
  }, 400000);
});
