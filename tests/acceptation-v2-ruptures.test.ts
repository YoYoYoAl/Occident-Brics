// Acceptation : scénarios de rupture de l'ordre mondial et partie prolongée jusqu'en 2050 (demande du 2 novembre 2026).
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as MN from "../src/v2/monnaie";
import * as EV from "../src/v2/evolution";
import { RUPTURES, PROJECTIONS_2050, PROJECTIONS_2050_B, PROJECTIONS_2050_C } from "../src/contenu/ruptures";

const jouerAnnee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); };
const partie = (g: number) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); while (!e.fin) jouerAnnee(e); return e; };
const NOUVEAUX = [...RUPTURES, ...PROJECTIONS_2050, ...PROJECTIONS_2050_B, ...PROJECTIONS_2050_C];

describe("Ruptures de l'ordre mondial et partie jusqu'en 2050 (acceptation)", () => {
  it("1. contenu : au moins 40 ruptures, chaque année 2036-2050 a des événements ; pays, conditions et identifiants valides", () => {
    expect(RUPTURES.length).toBeGreaterThanOrEqual(40);
    for (let a = 2036; a <= 2050; a++) expect(NOUVEAUX.filter(h => h.annee === a).length).toBeGreaterThanOrEqual(3);
    const e = M.creerPartieV2(1, null as any), ids = new Set(M.HISTORIQUES_V2.map(h => h.id));
    expect(ids.size).toBe(M.HISTORIQUES_V2.length); // pas de doublon
    for (const h of NOUVEAUX) {
      expect(h.probabilite).toBeGreaterThan(0); expect(h.probabilite).toBeLessThanOrEqual(1);
      for (const p of h.pays) expect(e.pays[p], `${h.id} : ${p}`).toBeDefined();
      for (const c of h.conditions) if (c.type === "evenement") { expect(ids.has(c.id), `${h.id} : ${c.id}`).toBe(true); expect(M.HISTORIQUES_V2.find(x => x.id === c.id)!.annee).toBeLessThanOrEqual(h.annee); }
    }
    for (const id of ["r_monnaie_brics", "r_crypto_emergents", "r_blocus_taiwan", "r_invasion_taiwan", "r_dollar_crise", "r_sortie_otan", "r_effondrement_russie"]) expect(ids.has(id)).toBe(true);
  });
  it("2. conditions : enchaînement (pas d'invasion sans blocus, pas de monnaie BRICS sans unité de compte) et exclusion (monnaie lancée = pas d'échec)", () => {
    const e = M.creerPartieV2(3, null as any);
    const h = M.HISTORIQUES_V2.find(x => x.id === "r_invasion_taiwan")!;
    e.tension = 9; e.faits = [];
    expect(h.conditions.every(c => M.conditionV2(e, c))).toBe(false);
    e.faits = ["r_blocus_taiwan"]; expect(h.conditions.every(c => M.conditionV2(e, c))).toBe(true);
    e.tension = 1; expect(h.conditions.every(c => M.conditionV2(e, c))).toBe(false); // cran 1 < 3
    const ech = M.HISTORIQUES_V2.find(x => x.id === "r_monnaie_brics_echec")!;
    e.faits = ["p_unite_brics"]; expect(ech.conditions.every(c => M.conditionV2(e, c))).toBe(true);
    e.faits = ["p_unite_brics", "r_monnaie_brics"]; expect(ech.conditions.every(c => M.conditionV2(e, c))).toBe(false);
    expect(M.cranV2({ tension: 0 } as any)).toBe(1); expect(M.cranV2({ tension: 10 } as any)).toBe(5);
  });
  it("3. partie complète (4 parties) : fin en 2050, conditions respectées, des ruptures ont lieu, aucune valeur non finie", () => {
    let ruptures = 0;
    for (const g of [31, 32, 33, 34]) {
      const e = partie(g), f = e.faits!;
      expect(e.annee).toBe(2050); expect(e.fin).toBe(true); expect(e.decomptes![e.decomptes!.length - 1].annee).toBe(2050);
      if (f.includes("r_invasion_taiwan")) expect(f.includes("r_blocus_taiwan")).toBe(true);
      if (f.includes("r_monnaie_brics")) { expect(f.includes("p_unite_brics")).toBe(true); expect(f.includes("r_monnaie_brics_echec")).toBe(false); }
      if (f.includes("r_krach_crypto")) expect(f.includes("r_crypto_emergents")).toBe(true);
      ruptures += f.filter(i => i.startsWith("r_")).length;
      for (const p of Object.values(e.pays)) for (const v of [p.pib, p.population, p.stabilite, p.att.OCC, p.eco.CHN]) expect(Number.isFinite(v)).toBe(true);
      const w = e.monnaie!.mondiales; expect(w.dollar + w.euro + w.autresOcc + w.brics + w.or + (w.crypto ?? 0)).toBeCloseTo(1, 5);
    }
    expect(ruptures).toBeGreaterThanOrEqual(4); // au moins une rupture par partie en moyenne
  }, 300_000);
  it("4. cryptos : une adoption massive crée une part de réserves, un krach la réduit ; les parts somment toujours à 100 %", () => {
    const e = M.creerPartieV2(5, null as any), w = e.monnaie!.mondiales;
    expect(w.crypto).toBe(0);
    MN.effetEvenement(e, { type: "mondiales", crypto: 0.03 }); expect(w.crypto).toBeCloseTo(0.03);
    expect(w.dollar + w.euro + w.autresOcc + w.brics + w.or + w.crypto!).toBeCloseTo(1, 5);
    MN.effetEvenement(e, { type: "mondiales", crypto: -0.05 }); expect(w.crypto).toBe(0);
  });
  it("5. une monnaie BRICS laisse une trace durable : 10 ans après, la part occidentale reste plus basse qu'sans elle", () => {
    const a = M.creerPartieV2(7, null as any), b = M.creerPartieV2(7, null as any);
    MN.effetEvenement(a, { type: "mondiales", occ: -0.05, or: 0.01 });
    for (let i = 0; i < 10; i++) for (const e of [a, b]) MN.finAnnee(e, { OCC: 2, CHN: 2 });
    expect(MN.partOccidentale(b) - MN.partOccidentale(a)).toBeGreaterThan(0.015);
  });
  it("6. croissance de fond : au-delà de 2030 elle converge vers 2 % (l'Inde ralentit, rien n'est figé jusqu'en 2050)", () => {
    const i30 = EV.tendancePib("IND", 2030), i50 = EV.tendancePib("IND", 2050);
    expect(i30).toBeGreaterThan(i50); expect(Math.abs(i50 - 2)).toBeLessThan(0.3 * Math.abs(i30 - 2));
    expect(M.ANNEE_FIN).toBe(2050); expect(M.JAUGE.annees).toBe(51);
  });
});
