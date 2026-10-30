// v35 : refonte de l'interface (30/10) — carte principale verrouillée, panneau en 3 étapes colorées, événements un par un,
// portraits illustrés uniquement, carte du trimestre en fenêtre centrale.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { creerPartie, finRound, operer, peutOperer, EPARGNE, ACCELERATION } from "../src/moteur/partie";
import { lancerPlan, ciblesPossibles, accelerer, peutAccelerer, plansDe, freiner, peutFreiner, FREIN } from "../src/moteur/plans";
const SANS_ALEA = { generiques: false, ia: false, format: "2000-2035" as const };
const lire = (f: string) => readFileSync(f, "utf8");

describe("v35", () => {
  it("1. carte verrouillée et entière : ni molette ni glisser, zoom minimal = carte complète", () => {
    const src = lire("src/interface/carte.ts");
    expect(src).toMatch(/const VERROU = true/);
    expect(src).toMatch(/kMin = \(\) => Math\.min\(1, hauteurVue \/ HAUTEUR\)/);
  });
  it("2. plus aucun visage dessiné : portraitSvg n'est plus utilisé hors de sa définition", () => {
    for (const f of ["src/interface/main.ts", "src/interface/conseil-ui.ts", "src/interface/pouvoir-ui.ts"]) expect(lire(f)).not.toMatch(/portraitSvg\(/);
    expect(lire("src/interface/portraits.ts")).toMatch(/SECOURS\[numeroNom\(d\.nom\) % SECOURS\.length\]/);
  });
  it("3. panneau en 3 étapes avec repères À faire / Possible / À quoi ça sert", () => {
    const src = lire("src/interface/main.ts");
    expect(src).toMatch(/Étape 2 sur 3/); expect(src).toMatch(/Étape 3 sur 3/);
    expect(src).toMatch(/<b>À faire<\/b>/); expect(src).toMatch(/<b>Possible<\/b>/); expect(src).toMatch(/<b>À quoi ça sert<\/b>/);
  });
  it("4. événements : une fenêtre à la fois (6 au plus, réactions d'abord), le reste en journal compact cliquable", () => {
    const src = lire("src/interface/main.ts");
    expect(src).toMatch(/MAX_UNE = 6/);
    expect(src).toMatch(/candidats\.filter\(j => boutonsReaction\(j\)\)/);
    expect(src).toMatch(/data-voir-pays/);
    expect(src).toMatch(/Laisser faire →/);
  });
  it("5. « Le monde » en fenêtre centrale et carte du trimestre ouverte en fenêtre centrale", () => {
    const css = lire("src/interface/style.css");
    expect(css).toMatch(/body\.phase-monde \.panneau \{ position: absolute/);
    expect(css).toMatch(/\.ph-cartes \.carte-jeu\.ouverte \{ position: fixed/);
  });
  it("6. thème clair : fond et texte", () => {
    const css = lire("src/interface/style.css");
    expect(css).toMatch(/--fond: ?#f3eee4/); expect(css).toMatch(/color-scheme: light/);
  });
  it("7. points d'opérations : une opération sur un pays ne touche pas aux points des ministres", () => {
    const e = creerPartie(5, "OCC", SANS_ALEA); e.camps.OCC.pa = 3; e.camps.OCC.budget = 10;
    const avant = structuredClone(e.camps.OCC.points);
    expect(peutOperer(e, "OCC", "politique", "BRA")).toBeNull();
    const e2 = operer(e, "OCC", "politique", "BRA");
    expect(e2.camps.OCC.pa).toBe(2);
    expect(e2.camps.OCC.points).toEqual(avant);
    expect(e2.pays.BRA.influence.OCC.p).toBeGreaterThan(e.pays.BRA.influence.OCC.p);
    e.camps.OCC.pa = 0; expect(peutOperer(e, "OCC", "politique", "BRA")).toMatch(/insuffisants/);
  });
  it("8. accélérer une orientation : +10 % par point, plafonné à 99 (l'arrivée se joue au trimestre)", () => {
    let e = creerPartie(6, "OCC", SANS_ALEA); e.camps.OCC.budget = 20;
    const o = "commerce" as Parameters<typeof lancerPlan>[2];
    const cible = ciblesPossibles(e, "OCC", o)[0].id; e = lancerPlan(e, "OCC", o, cible, 4, 2);
    const p = plansDe(e, "OCC")[0], avant = p.progres; e.camps.OCC.pa = 20;
    const e2 = accelerer(e, "OCC", p.id, 2);
    expect(plansDe(e2, "OCC")[0].progres).toBeCloseTo(avant + 2 * ACCELERATION.parPoint);
    expect(e2.camps.OCC.pa).toBe(18);
    expect(plansDe(accelerer(e, "OCC", p.id, 15), "OCC")[0].progres).toBe(99);
    e.camps.OCC.pa = 0; expect(peutAccelerer(e, "OCC", p.id, 1)).toMatch(/insuffisants/);
  });
  it("9. points gardés d'un trimestre à l'autre jusqu'à 6", () => {
    let e = creerPartie(7, "OCC", SANS_ALEA); e.camps.OCC.pa = 4; e = finRound(e);
    expect(e.camps.OCC.pa).toBe(4); // 2000 T2 : pas de réserve d'opérations
    e.camps.OCC.pa = 11; e = finRound(e);
    expect(EPARGNE.max).toBe(6); expect(e.camps.OCC.pa).toBe(6); // 2000 T3 : plafond
  });
  it("10. contrer l'adversaire : −8 % par point sur une orientation adverse révélée, refusé si non révélée", () => {
    let e = creerPartie(8, "OCC", SANS_ALEA); e.camps.CHN.budget = 20;
    const o = "commerce" as Parameters<typeof lancerPlan>[2];
    e = lancerPlan(e, "CHN", o, ciblesPossibles(e, "CHN", o)[0].id, 4, 2);
    const p = plansDe(e, "CHN")[0]; p.progres = 40; e.camps.OCC.pa = 3;
    expect(peutFreiner(e, "OCC", p.id, 1)).toMatch(/non révélée/);
    p.vuPar.push("OCC");
    const e2 = freiner(e, "OCC", p.id, 2);
    expect(plansDe(e2, "CHN")[0].progres).toBe(40 - 2 * FREIN.parPoint);
    expect(e2.camps.OCC.pa).toBe(1);
  });
});
