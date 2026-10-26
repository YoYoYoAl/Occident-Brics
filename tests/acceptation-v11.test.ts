// Tests d'acceptation de la v11 (25/10/2026) : domaines d'action, modes (automatique, conseiller, manuel), orientations,
// échelles militaires, blocus conditionné, complémentarité commerciale, budget au dixième.
import { describe, it, expect } from "vitest";
import {
  creerPartie, finRound, agir, peutAgir, DOMAINES, dispo, conseils, reglerMode, modeDe, orienter, reglerPartOrientations, peutBloquer,
  complementarite, BOOST_COMMERCE, PART_IMMEDIATE, type EtatPartie,
} from "../src/moteur/partie";
import { PROFILS } from "../src/data/commerce";

const SANS_ALEA = { generiques: false, ia: false };
const prets = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) { e.camps[c].budget = 60; e.camps[c].cp = 70; } return e; };

describe("v11", () => {
  it("1. domaines : 2 actions en économie, diplomatie, défense, 1 secrète par trimestre ; points de crise en complément", () => {
    let e = prets(finRound(creerPartie(1, "OCC", SANS_ALEA)));
    expect(e.camps.OCC.points).toEqual({ eco: DOMAINES.eco.points, diplo: 2, defense: 2, secret: 1 });
    e = agir(agir(e, "OCC", "politique", "BRA"), "OCC", "culturelle", "IND");
    expect(e.camps.OCC.points!.diplo).toBe(0);
    expect(peutAgir(e, "OCC", "politique", "MEX")).toMatch(/Points diplomatie insuffisants/);
    e.camps.OCC.pa = 1; // une carte jouée pour ses points
    expect(dispo(e.camps.OCC, "diplo")).toBe(1);
    e = agir(e, "OCC", "politique", "MEX");
    expect(e.camps.OCC.pa).toBe(0); expect(e.camps.OCC.points!.eco).toBe(2); // les autres domaines sont intacts
    expect(finRound(e).camps.OCC.points!.diplo).toBe(2); // non reporté, renouvelé
  });

  it("2. conseiller : 4 options variées et jouables ; automatique : le ministre dépense ses points à la fin du trimestre", () => {
    const e = prets(creerPartie(2, "OCC"));
    const o = conseils(e, "OCC", "eco");
    expect(o.length).toBeGreaterThanOrEqual(3); expect(o.length).toBeLessThanOrEqual(4);
    expect(new Set(o.map(x => x.iso)).size).toBe(o.length);
    for (const x of o) expect(peutAgir(e, "OCC", x.type, x.iso)).toBeNull();
    expect(modeDe(e, "OCC", "eco")).toBe("auto");
    const auto = finRound(e), manuel = finRound(reglerMode(e, "OCC", "eco", "manuel"));
    const actionsEco = (x: EtatPartie) => x.journal.filter(j => j.round === 0 && j.camp === "OCC" && j.type === "action" && /Influence économique|Développement|Investir|Prêt/.test(j.titre)).length;
    expect(actionsEco(auto)).toBeGreaterThan(0); expect(actionsEco(manuel)).toBe(0);
  });

  it("3. orientations : une part réglable du budget s'applique toute seule ; cultiver fait monter l'influence", () => {
    let e = prets(creerPartie(3, "OCC", SANS_ALEA));
    e = reglerPartOrientations(orienter(e, "OCC", "IDN", "cultiver"), "OCC", 0.1);
    const b0 = e.camps.OCC.budget, x = finRound(e), y = finRound(prets(creerPartie(3, "OCC", SANS_ALEA)));
    expect(b0 - x.camps.OCC.budget).toBeGreaterThan(5.9 - 1e-9); // 10 % de 60 (au dixième), avant le reste du trimestre
    expect(x.pays.IDN.influence.OCC.p).toBeGreaterThan(y.pays.IDN.influence.OCC.p);
    expect(Math.round(x.camps.OCC.budget * 10) / 10).toBe(x.camps.OCC.budget); // budget au dixième
    expect(() => reglerPartOrientations(e, "OCC", 0.5)).not.toThrow();
    expect(reglerPartOrientations(e, "OCC", 0.5).camps.OCC.partOrientations).toBe(0.15);
  });

  it("4. échelles militaires : on monte cran par cran ; putsch après intimidation ; blocus avec une base chez un riverain", () => {
    let e = prets(creerPartie(4, "OCC", SANS_ALEA)); e.camps.OCC.pa = 10;
    expect(peutAgir(e, "OCC", "exercices", "GBR")).toMatch(/d'abord « Vente d'armes »/);
    e = agir(e, "OCC", "armes", "GBR");
    expect(e.camps.OCC.crans!.GBR.coop).toBe(1);
    expect(peutAgir(e, "OCC", "exercices", "GBR")).toBeNull();
    expect(peutAgir(e, "OCC", "militaire", "GBR")).toMatch(/d'abord « Exercices conjoints »/);
    e.pays.VEN.stabilite = 30;
    expect(peutAgir(e, "OCC", "putsch", "VEN")).toMatch(/intimidé/);
    expect(peutBloquer(e, "OCC", "ormuz")).toMatch(/riverain/);
    e.camps.OCC.crans!.OMN = { coop: 3, coer: 0, round: 0 };
    expect(peutBloquer(e, "OCC", "ormuz")).toBeNull();
  });

  it("5. complémentarité commerciale : réciproque, à sens unique ou normale, et l'effet sur les actions économiques", () => {
    expect(PROFILS.SAU.offre).toContain("energie"); expect(PROFILS.JPN.besoin).toContain("energie");
    expect(complementarite("SAU", "OCC").type).toBe("reciproque"); // pétrole contre céréales et produits industriels
    const k = complementarite("NGA", "CHN");
    expect(["il_a_besoin", "reciproque"]).toContain(k.type);
    const e = prets(creerPartie(5, "OCC", SANS_ALEA)), p0 = e.pays.SAU.influence.OCC.e, g = 8 * (1 - p0 / 100);
    expect(agir(e, "OCC", "economique", "SAU").pays.SAU.influence.OCC.e - p0).toBeCloseTo(g * BOOST_COMMERCE.reciproque * PART_IMMEDIATE, 9);
  });
});
