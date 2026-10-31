// Tests d'acceptation de la v17 (28/10/2026) : conseils et plans pluriannuels, duels aux jalons, riposte, réserve d'opérations.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { creerPartie, finRound, type EtatPartie } from "../src/moteur/partie";
import {
  lancerPlan, peutLancerPlan, abandonnerPlan, ciblesPossibles, plansDe, vitesse, conclureDuel, multPlan, riposterPlan, peutRiposterPlan,
  remplacerChef, PLANS, RESERVE, OBJECTIFS, LISTE_OBJECTIFS, type Plan,
} from "../src/moteur/plans";
import { REGLES } from "../src/duels/index";
import { CARTES_GENEREES, IMAGES_GENEREES } from "../src/contenu/cartes-generees";
import { CARTES_ERE1 } from "../src/contenu/cartes";
import { CARTES_ERE2 } from "../src/contenu/cartes2";

const SANS_ALEA = { generiques: false, ia: false };
const premier = (e: EtatPartie, o: Parameters<typeof ciblesPossibles>[2]) => ciblesPossibles(e, "OCC", o)[0].id;
const riche = (e: EtatPartie) => { e.camps.OCC.budget = 200; e.camps.CHN.budget = 200; return e; };

describe("v17 : conseils et plans", () => {
  it("1. lancer un plan : durées 1 an à 3 ans, 5 plans au plus, pas de doublon, cibles valides", () => {
    let e = riche(creerPartie(1, "OCC", SANS_ALEA));
    const c = premier(e, "commerce");
    expect(peutLancerPlan(e, "OCC", "commerce", c, 5, 2)).toMatch(/Durée/);
    expect(peutLancerPlan(e, "OCC", "commerce", "XXX", 8, 2)).toMatch(/cible/);
    e = lancerPlan(e, "OCC", "commerce", c, 8, 2);
    expect(peutLancerPlan(e, "OCC", "commerce", c, 8, 2)).toMatch(/identique/);
    for (const o of ["influence", "rayonnement", "infrastructures", "techno"] as const) e = lancerPlan(e, "OCC", o, premier(e, o), 4, 1);
    expect(plansDe(e, "OCC")).toHaveLength(PLANS.max);
    expect(peutLancerPlan(e, "OCC", "presence", premier(e, "presence"), 4, 1)).toMatch(/Au plus 5/);
    for (const o of LISTE_OBJECTIFS) expect(OBJECTIFS[o].duels.length, o).toBeGreaterThan(0);
  });

  it("2. hors séance annuelle : un seul ajustement par trimestre", () => {
    let e = riche(finRound(creerPartie(2, "OCC", SANS_ALEA))); // 2e trimestre
    e = lancerPlan(e, "OCC", "commerce", premier(e, "commerce"), 4, 1);
    expect(peutLancerPlan(e, "OCC", "influence", premier(e, "influence"), 4, 1)).toMatch(/un seul ajustement/);
    expect(() => remplacerChef(e, "OCC", "economie")).toThrow(/séance annuelle/);
  });

  it("3. un plan avance chaque trimestre, coûte du budget, puis s'accomplit et disparaît", () => {
    let e = riche(creerPartie(3, "OCC", SANS_ALEA));
    const c = premier(e, "commerce");
    e = lancerPlan(e, "OCC", "commerce", c, 4, 2);
    const inf0 = e.pays[c].influence.OCC.e;
    const e1 = finRound(e), p1 = e1.plans!.find(p => p.camp === "OCC")!;
    expect(p1.progres).toBeGreaterThan(10);
    expect(e1.pays[c].influence.OCC.e).toBeGreaterThan(inf0);
    let x = e1;
    for (let k = 0; k < 10 && plansDe(x, "OCC").length; k++) x = riche(finRound(x));
    expect(plansDe(x, "OCC")).toHaveLength(0);
    expect(x.journal.some(j => j.titre.startsWith("Plan accompli"))).toBe(true);
  });

  it("4. un plan rival sur la même cible ralentit les deux plans", () => {
    let e = riche(creerPartie(4, "OCC", SANS_ALEA));
    const z = premier(e, "influence");
    e = lancerPlan(e, "OCC", "influence", z, 8, 2);
    const seul = vitesse(e, e.plans![0]);
    e = lancerPlan(e, "CHN", "influence", z, 8, 3);
    expect(vitesse(e, e.plans![0])).toBeLessThan(seul);
  });

  it("5. jalon disputé : le duel attend le joueur, se joue (ou se délègue) et change la progression", () => {
    let e = riche(creerPartie(5, "OCC", { generiques: false, ia: true }));
    e = lancerPlan(e, "OCC", "election", premier(e, "election"), 8, 2);
    e.plans![0].progres = PLANS.jalons[0] - 0.5;
    e = finRound(e);
    const d = e.duels!.find(x => x.attaquant === "OCC")!;
    expect(d).toBeDefined();
    expect(OBJECTIFS.election.duels).toContain(d.type);
    expect(REGLES[d.type]).toBeDefined();
    const avant = e.plans!.find(p => p.id === d.plan)!.progres;
    const gagne = conclureDuel(e, d.id, 1);
    expect(gagne.duels!.some(x => x.id === d.id)).toBe(false);
    expect(gagne.plans!.find(p => p.id === d.plan)!.progres).toBeCloseTo(avant + PLANS.elan, 6);
    expect(conclureDuel(e, d.id, 0).plans!.find(p => p.id === d.plan)!.progres).toBeCloseTo(Math.max(0, avant - PLANS.recul), 6);
    // non joué : réglé automatiquement au trimestre suivant
    expect(riche(finRound(e)).duels!.some(x => x.id === d.id)).toBe(false);
  });

  it("6. les conseils suivent les plans : actions automatiques renforcées dans les pays visés", () => {
    let e = riche(creerPartie(6, "OCC", SANS_ALEA));
    const c = premier(e, "commerce");
    expect(multPlan(e, "OCC", c, "economique")).toBe(1);
    e = lancerPlan(e, "OCC", "commerce", c, 8, 3);
    expect(multPlan(e, "OCC", c, "economique")).toBeCloseTo(1 + PLANS.multConseil * 3, 9);
    expect(multPlan(e, "OCC", c, "militaire")).toBe(1);
  });

  it("7. réserve d'opérations : +1 par trimestre, débloquée aux 1er et 4e trimestres", () => {
    let e = creerPartie(7, "OCC", SANS_ALEA);
    for (let k = 0; k < 3; k++) e = finRound(e); // passe au 4e trimestre
    expect(e.camps.OCC.pa).toBeGreaterThanOrEqual(RESERVE.gain);
    expect(e.camps.OCC.pa).toBeLessThanOrEqual(RESERVE.max);
  });

  it("8. riposte : 3 CP, une fois par an, sur un plan adverse repéré", () => {
    let e = riche(creerPartie(8, "OCC", { generiques: false, ia: true }));
    e = lancerPlan(e, "CHN", "influence", ciblesPossibles(e, "CHN", "influence")[0].id, 8, 3); // massif : repéré d'emblée
    const p = e.plans!.find(x => x.camp === "CHN") as Plan;
    expect(peutRiposterPlan(e, "OCC", p.id)).toBeNull();
    const x = riposterPlan(e, "OCC", p.id);
    expect(x.camps.OCC.cp).toBe(e.camps.OCC.cp - 3);
    expect(x.duels!.some(d => d.plan === p.id && d.motif === "riposte" && d.attaquant === "OCC")).toBe(true);
    expect(peutRiposterPlan(x, "OCC", p.id)).toMatch(/par an|déjà/);
  });

  it("9. abandon : la moitié de la récompense après 50 %, rien avant", () => {
    let e = riche(creerPartie(9, "OCC", SANS_ALEA));
    e = lancerPlan(e, "OCC", "commerce", premier(e, "commerce"), 8, 2);
    const a = abandonnerPlan(e, "OCC", e.plans![0].id);
    expect(a.journal.slice(-1)[0].texte).toMatch(/perdu/);
    e.plans![0].progres = 60;
    expect(abandonnerPlan(e, "OCC", e.plans![0].id).journal.slice(-1)[0].texte).toMatch(/moitié/);
  });

  it("10. IA contre IA : chaque camp lance ses plans à la séance annuelle", () => {
    const e = finRound(creerPartie(10, null, { generiques: false, ia: true }));
    expect(plansDe(e, "OCC").length).toBeGreaterThan(0);
    expect(plansDe(e, "CHN").length).toBeGreaterThan(0);
  });

  it("11. interface : étapes conseils et plans puis duels, aide des duels jamais montrée au joueur", () => {
    const src = readFileSync("src/interface/main.ts", "utf8");
    expect(src).toMatch(/ETAPES: Etape\[\] = \["evenements", "carte", "plans", "duels", "defense", "eco", "diplo", "secret", "bilan"\]/);
    expect(readFileSync("src/interface/duel-ui.ts", "utf8")).not.toMatch(/\.aide\b/);
  });

  it("12. cartes ×15 : cartes générées par région et par ère, symétriques entre les blocs, cibles valides", () => {
    const ecrites = CARTES_ERE1.length + CARTES_ERE2.length, e = creerPartie(12, "OCC", SANS_ALEA);
    expect(ecrites + CARTES_GENEREES.length).toBeGreaterThanOrEqual(15 * ecrites);
    expect(new Set(CARTES_GENEREES.map(c => c.id)).size).toBe(CARTES_GENEREES.length);
    expect(CARTES_GENEREES.filter(c => c.camp === "OCC").length).toBe(CARTES_GENEREES.filter(c => c.camp === "CHN").length);
    for (const c of CARTES_GENEREES) {
      expect(c.texte + c.titre, c.id).not.toMatch(/\{|\}/);
      expect(IMAGES_GENEREES[c.id], c.id).toMatch(/^famille_/);
      for (const m of c.modes) for (const f of [...m.effets, ...(m.caches ?? []).flatMap(h => h.effets)])
        if ("pays" in f && Array.isArray(f.pays)) for (const i of f.pays) expect(e.pays[i], `${c.id} ${i}`).toBeDefined();
    }
    const pioche = new Set([...e.pioche, ...e.defausse, ...e.camps.OCC.main, ...e.camps.CHN.main]);
    expect(CARTES_GENEREES.filter(c => c.ere === 1).every(c => pioche.has(c.id))).toBe(true);
  });

  it("13. une partie IA contre IA de 3 ans joue des cartes générées sans erreur", () => {
    let e = creerPartie(13, null, { generiques: true, ia: true });
    for (let k = 0; k < 12; k++) e = finRound(e);
    expect(e.journal.some(j => CARTES_GENEREES.some(c => j.titre.includes(c.titre)))).toBe(true);
  });
});
