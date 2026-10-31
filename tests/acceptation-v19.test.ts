// Tests d'acceptation de la v19 (29/10/2026) : régions des 30 pays clés, découpage de guerre des autres, occupation, contrôle après la paix.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, agir, chargerPartie, serialiserPartie, poidsCamp, alignement, type EtatPartie } from "../src/moteur/partie";
import { REGIONS_CLES } from "../src/data/regions";
import { PROFILS } from "../src/data/commerce";
import { regionsDe, decoupageGenerique, coutRegion, signerPaix, peutSignerPaix, suiviRegions, rendreRegion, controleur, aeDe, termesAuto, nucleaire, partAnnexee, coutTerme, peutAnnexerRegion, annexerRegion, ANNEXION, REGION, AE, SCORE, type Intervention } from "../src/moteur/guerre";

const SANS_ALEA = { generiques: false, ia: false };
function enGuerre(iso: string, score: number): EtatPartie {
  let e = creerPartie(19, "OCC", SANS_ALEA); const c = e.camps.OCC;
  c.budget = 100; c.cp = 90; c.points = { ...c.points!, defense: 20 } as typeof c.points; (c.crans ??= {})[iso] = { coop: 0, coer: 2, round: 0 };
  e.dirigeants!.OCC.traits = ["stratege", "charismatique"];
  e = agir(e, "OCC", "intervention", iso);
  const fige = { ...SCORE }; Object.assign(SCORE, { base: 0, forces: 0, alea: 0, strategie: 0, usure: 0 });
  try { (e.interventions[0] as Intervention).score = score; e = finRound(e); } finally { Object.assign(SCORE, fige); }
  return e;
}
const it0 = (e: EtatPartie) => e.interventions[0] as Intervention;

describe("v19 : régions", () => {
  it("1. 30 pays clés, 2 à 5 régions chacun, populations qui somment à 100 %, valeur stratégique 0-3, aucun pays nucléaire hors Corée du Nord", () => {
    const e = creerPartie(1, "OCC", SANS_ALEA), l = Object.keys(REGIONS_CLES);
    expect(l).toHaveLength(30);
    for (const iso of l) {
      const r = REGIONS_CLES[iso];
      expect(e.pays[iso], iso).toBeDefined();
      expect(r.length, iso).toBeGreaterThanOrEqual(2); expect(r.length, iso).toBeLessThanOrEqual(5);
      expect(r.reduce((s, x) => s + x.pop, 0), iso).toBeCloseTo(1, 6);
      expect(new Set(r.map(x => x.id)).size, iso).toBe(r.length);
      for (const x of r) { expect(x.strat).toBeGreaterThanOrEqual(0); expect(x.strat).toBeLessThanOrEqual(3); }
      if (iso !== "PRK") expect(nucleaire(iso, 2035), iso).toBe(false);
    }
  });

  it("2. découpage de guerre des autres pays : capitale 50 %, nord 30 %, sud 20 %, toutes les ressources du pays réparties", () => {
    for (const iso of ["BRA", "NER", "MEX", "GAB"]) {
      const r = decoupageGenerique(iso);
      expect(r.map(x => x.pop)).toEqual([0.5, 0.3, 0.2]);
      expect(r.flatMap(x => x.ressources).sort()).toEqual([...(PROFILS[iso]?.offre ?? [])].sort());
      expect(regionsDe(iso)).toEqual(r);
    }
    expect(regionsDe("IRQ")).toBe(REGIONS_CLES.IRQ);
  });

  it("3. l'occupation suit le score : aucune région à 0, la plus stratégique d'abord, toutes à 100", () => {
    expect(it0(enGuerre("IRQ", 0)).occupees).toEqual([]);
    expect(it0(enGuerre("IRQ", 30)).occupees).toEqual(["bagdad"]);
    expect(it0(enGuerre("IRQ", 99)).occupees!.sort()).toEqual(["bagdad", "bassora", "kurdistan"]);
    const e = enGuerre("IRQ", 30); expect(e.journal.some(j => j.titre.includes("prise de la région « Bagdad et le centre »"))).toBe(true);
  });

  it("4. paix : garder une région occupée (coût selon population et valeur stratégique), recettes, instabilité, restitution", () => {
    const e = enGuerre("IRQ", 99), r = REGIONS_CLES.IRQ.find(x => x.id === "bassora")!;
    expect(coutRegion(r)).toBe(Math.round(10 + 30 * 0.3 + 5 * 3));
    const g = structuredClone(e); it0(g).occupees = ["bagdad"];
    expect(peutSignerPaix(g, "OCC", "IRQ", ["region:bassora"])).toMatch(/occupée/);
    const ae0 = aeDe(e, "OCC", "moyen_orient"), x = signerPaix(e, "OCC", "IRQ", ["region:bassora"]);
    expect(controleur(x, "IRQ", "bassora")).toBe("OCC");
    expect(aeDe(x, "OCC", "moyen_orient")).toBeCloseTo(ae0 + AE.victoire * coutRegion(r), 6);
    const b0 = x.camps.OCC.budget, s0 = x.pays.IRQ.stabilite; x.pays.IRQ.influence.OCC.p = 90; suiviRegions(x);
    expect(x.camps.OCC.budget).toBeCloseTo(b0 + REGION.budgetRessource * 1 + REGION.budgetStrat * 3, 9);
    expect(x.pays.IRQ.stabilite).toBe(s0 - REGION.stabilite);
    const y = rendreRegion(x, "OCC", "IRQ", "bassora");
    expect(controleur(y, "IRQ", "bassora")).toBeNull();
    expect(aeDe(y, "OCC", "moyen_orient")).toBeCloseTo(Math.max(0, aeDe(x, "OCC", "moyen_orient") - REGION.rendreAE), 6);
    expect(() => rendreRegion(y, "OCC", "IRQ", "bassora")).toThrow();
  });

  it("5. l'IA garde les régions occupées les plus stratégiques quand le score le permet", () => {
    const e = enGuerre("IRQ", 99), t = termesAuto(e, it0(e));
    expect(t[0]).toBe("regime"); expect(t.some(x => x.startsWith("region:") && it0(e).occupees!.includes(x.slice(7)))).toBe(true); // le score restant (après la riposte d'une éventuelle coalition) fixe la région gardée
  });

  it("6. révolte : une région tenue dans un pays qui penche vers l'adversaire finit par se libérer", () => {
    const x = signerPaix(enGuerre("IRQ", 99), "OCC", "IRQ", ["region:bassora"]);
    for (const c of ["e", "p", "m", "c"] as const) { x.pays.IRQ.influence.OCC[c] = 0; x.pays.IRQ.influence.CHN[c] = 90; }
    for (let k = 0; k < 100 && controleur(x, "IRQ", "bassora"); k++) suiviRegions(x);
    expect(controleur(x, "IRQ", "bassora")).toBeNull();
    expect(x.journal.some(j => j.titre.includes("révolte"))).toBe(true);
  });

  it("8. annexion : 1,5 fois le coût, expansion double, définitive (pas de révolte), la part de population compte pour le bloc dans le score", () => {
    const e = enGuerre("IRQ", 99), r = REGIONS_CLES.IRQ.find(x => x.id === "bassora")!;
    expect(coutTerme("annexe:bassora", "IRQ")).toBe(Math.round(1.5 * coutRegion(r)));
    expect(peutSignerPaix(e, "OCC", "IRQ", ["region:bassora", "annexe:bassora"])).toMatch(/soit occupée, soit annexée/);
    const ae0 = aeDe(e, "OCC", "moyen_orient"), x = signerPaix(e, "OCC", "IRQ", ["annexe:bassora"]);
    expect(aeDe(x, "OCC", "moyen_orient")).toBeCloseTo(ae0 + AE.victoire * 2 * coutTerme("annexe:bassora", "IRQ"), 6);
    expect(partAnnexee(x, "OCC", "IRQ")).toBeCloseTo(0.3, 9);
    for (const c of ["e", "p", "m", "c"] as const) { x.pays.IRQ.influence.OCC[c] = 0; x.pays.IRQ.influence.CHN[c] = 90; }
    expect(alignement(x, "IRQ")).toBeLessThan(0);
    expect(poidsCamp(x, "OCC", "IRQ")).toBeCloseTo(0.3, 9);
    expect(poidsCamp(x, "CHN", "IRQ")).toBeCloseTo(0.7 * -alignement(x, "IRQ"), 9);
    for (let k = 0; k < 100; k++) suiviRegions(x);
    expect(controleur(x, "IRQ", "bassora")).toBe("OCC");
  });

  it("9. occuper puis annexer : possible après 2 ans d'occupation, 10 de capital politique, pas si le pays penche vers l'adversaire", () => {
    const x = signerPaix(enGuerre("IRQ", 99), "OCC", "IRQ", ["region:bassora"]);
    for (const c of ["e", "p", "m", "c"] as const) { x.pays.IRQ.influence.OCC[c] = 60; x.pays.IRQ.influence.CHN[c] = 10; }
    x.camps.OCC.cp = 50;
    expect(peutAnnexerRegion(x, "OCC", "IRQ", "bassora")).toMatch(/après 2 ans/);
    x.round += ANNEXION.delai;
    expect(peutAnnexerRegion(x, "OCC", "IRQ", "bassora")).toBeNull();
    const ae0 = aeDe(x, "OCC", "moyen_orient"), y = annexerRegion(x, "OCC", "IRQ", "bassora");
    expect(partAnnexee(y, "OCC", "IRQ")).toBeCloseTo(0.3, 9); expect(y.camps.OCC.cp).toBe(50 - ANNEXION.cp);
    expect(aeDe(y, "OCC", "moyen_orient")).toBeCloseTo(ae0 + AE.victoire * coutRegion(REGIONS_CLES.IRQ[1]), 6);
    expect(peutAnnexerRegion(y, "OCC", "IRQ", "bassora")).toMatch(/déjà/);
    for (const c of ["e", "p", "m", "c"] as const) { x.pays.IRQ.influence.OCC[c] = 0; x.pays.IRQ.influence.CHN[c] = 90; }
    expect(peutAnnexerRegion(x, "OCC", "IRQ", "bassora")).toMatch(/résiste/);
  });

  it("7. sauvegarde sans régions contrôlées : liste vide au chargement", () => {
    const e = creerPartie(7, "OCC", SANS_ALEA) as Partial<EtatPartie>; delete e.controles;
    expect(chargerPartie(serialiserPartie(e as EtatPartie)).controles).toEqual([]);
  });
});
