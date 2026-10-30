// Tests d'acceptation de la v29 (30/10/2026) : campagnes électorales (maquette 5) : leviers, sondages, fraude, scrutin, coup d'État.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, alignement, type EtatPartie } from "../src/moteur/partie";
import { lancerPlan, plansDe, ciblesPossibles, bilansNonVus } from "../src/moteur/plans";
import {
  CAMPAGNE, chanceScrutin, pointsCampagne, projection, reglerCampagne, peutReglerCampagne, scrutinDe, effortAdverse, apportCampagnes, conditionsCoup, peutTenterCoup, tenterCoup, payerDettes,
} from "../src/moteur/campagnes";
import { campagneHtml, blocCampagnesElectorales } from "../src/interface/campagne-ui";

const SANS_ALEA = { generiques: false, ia: false };
const riche = (e: EtatPartie) => { e.camps.OCC.budget = 200; e.camps.CHN.budget = 200; return e; };
const avecCampagne = (graine: number, intensite: 1 | 2 | 3 = 2) => { const e = lancerPlan(riche(creerPartie(graine, "OCC", SANS_ALEA)), "OCC", "election", "MEX", 4, intensite); return { e, p: plansDe(e, "OCC")[0] }; };
const L = (medias: number, partis: number, terrain: number, promesses: number) => ({ medias, partis, terrain, promesses });

describe("v29 : campagnes électorales", () => {
  it("1. « Peser sur une élection » ouvre une campagne calée sur le vrai scrutin (Mexique, 3e trimestre 2000)", () => {
    const { e, p } = avecCampagne(21);
    expect(ciblesPossibles(e, "OCC", "election").some(x => x.id === "MEX")).toBe(true);
    expect(scrutinDe(e, "MEX")).toMatchObject({ round: 2, annee: 2000 });
    expect(p.campagne).toMatchObject({ scrutin: 2, annee: 2000, fraude: false });
    expect(p.campagne!.depart).toBe(Math.round(50 + 20 * alignement(e, "MEX")));
    expect(Object.values(p.campagne!.leviers).reduce((a, b) => a + b, 0)).toBeCloseTo(pointsCampagne(p));
    expect(pointsCampagne(p)).toBe(4);
  });

  it("2. leviers : au plus 2 points par cran d'intensité, 4 par levier", () => {
    const { e, p } = avecCampagne(22);
    expect(peutReglerCampagne(e, "OCC", p.id, L(2, 2, 1, 0))).toMatch(/Au plus 4 points/);
    expect(peutReglerCampagne(e, "OCC", p.id, L(4.5, 0, 0, 0))).toMatch(/de 0 à 4/);
    const e2 = reglerCampagne(e, "OCC", p.id, L(1, 1, 1, 1), true);
    expect(plansDe(e2, "OCC")[0].campagne).toMatchObject({ leviers: L(1, 1, 1, 1), fraude: true });
  });

  it("3. projection : combiner les leviers rapporte plus qu'un seul ; la fraude augmente la chance ; le terrain amortit l'adversaire", () => {
    const { e, p: p0 } = avecCampagne(23);
    // règle du scrutin : écart = (sondage − 50) / 10 + 2 × penchant + hasard ±1, victoire au-delà de 1 ; sondage choisi pour un écart moyen de 1 : une chance sur deux
    const S = 50 - 20 * alignement(e, "MEX") + 10, p = p0;
    expect(chanceScrutin(e, p, S, false)).toBeCloseTo(0.5, 5);
    expect(chanceScrutin(e, p, S + 10, false)).toBeCloseTo(1, 5);
    expect(chanceScrutin(e, p, S, true)).toBeGreaterThan(0.5);
    expect(projection(e, p, L(1, 1, 1, 1), false).sondage).toBeGreaterThan(projection(e, p, L(4, 0, 0, 0), false).sondage);
        expect(effortAdverse(e, p, L(0, 0, 2, 0))).toBeCloseTo(CAMPAGNE.opposition / 2);
    expect(projection(e, p, L(0, 4, 0, 0), false).scandale).toBeGreaterThan(projection(e, p, L(0, 1, 0, 0), false).scandale);
    expect(projection(e, p, L(0, 0, 0, 2), false).dette).toBeCloseTo(CAMPAGNE.dette * 2 * CAMPAGNE.dureeDette);
  });

  it("4. jusqu'au scrutin : l'orientation reste ouverte (95 % au plus), puis se conclut ; les promesses se paient ensuite", () => {
    let { e, p } = avecCampagne(24);
    e = reglerCampagne(e, "OCC", p.id, L(1, 0, 1, 2), false);
    e = finRound(riche(e)); e = finRound(riche(e)); // 2000 T1, T2
    const q = plansDe(e, "OCC")[0];
    expect(q.progres).toBeLessThanOrEqual(95);
    expect(q.campagne!.sondage).not.toBe(q.campagne!.depart);
    e = finRound(riche(e)); // scrutin au 3e trimestre
    expect(plansDe(e, "OCC").filter(x => x.objectif === "election")).toHaveLength(0);
    const b = bilansNonVus(e, "OCC").find(x => x.objectif === "election")!;
    expect(["reussie", "echouee"]).toContain(b.issue);
    expect(e.camps.OCC.dette).toMatchObject({ parTrimestre: CAMPAGNE.dette * 2 });
    const x = structuredClone(e), avant = x.camps.OCC.budget; payerDettes(x);
    expect(x.camps.OCC.budget).toBeCloseTo(avant - CAMPAGNE.dette * 2, 5);
    if (b.issue === "echouee") expect(e.camps.OCC.coup).toMatchObject({ iso: "MEX" });
  });

  it("5. fraude démasquée : élection annulée pour le tricheur, capital politique −10", () => {
    const { e, p } = avecCampagne(25);
    const x = reglerCampagne(e, "OCC", p.id, L(1, 1, 1, 1), true); x.round = 2;
    const r = CAMPAGNE.risqueFraude; CAMPAGNE.risqueFraude = 1;
    try { const cp = x.camps.OCC.cp; expect(apportCampagnes(x, "MEX")).toBe(0); expect(plansDe(x, "OCC")[0].campagne!.resultat).toBe("annule"); expect(x.camps.OCC.cp).toBe(cp - 10); }
    finally { CAMPAGNE.risqueFraude = r; }
  });

  it("6. coup d'État : seulement après un scrutin perdu, sous conditions, jamais chez une puissance nucléaire", () => {
    const e = riche(creerPartie(26, "OCC", SANS_ALEA));
    expect(peutTenterCoup(e, "OCC", "MEX")).toMatch(/scrutin perdu/);
    e.camps.OCC.coup = { iso: "MEX", fin: e.round };
    e.pays.MEX.stabilite = 60; e.pays.MEX.influence.OCC.p = 30;
    expect(peutTenterCoup(e, "OCC", "MEX")).toMatch(/Ton influence politique au moins 40.*Stabilité au plus 45/);
    e.pays.MEX.stabilite = 30; e.pays.MEX.influence.OCC.p = 50;
    expect(peutTenterCoup(e, "OCC", "MEX")).toBeNull();
    const k = conditionsCoup(e, "OCC", "MEX"); expect(k.chance).toBeGreaterThan(0.35);
    const apres = tenterCoup(e, "OCC", "MEX");
    expect(apres.camps.OCC.coup).toBeUndefined();
    const reussi = apres.pays.MEX.influence.OCC.p >= 55;
    expect(apres.camps.OCC.cp).toBe(e.camps.OCC.cp - (reussi ? CAMPAGNE.coup.cp : CAMPAGNE.coup.cpEchec));
    e.camps.OCC.coup = { iso: "RUS", fin: e.round }; e.pays.RUS.stabilite = 20; e.pays.RUS.influence.OCC.p = 60;
    expect(peutTenterCoup(e, "OCC", "RUS")).toMatch(/nucléaire/);
  });

  it("7. écrans : la carte de campagne et la fenêtre s'affichent", () => {
    const { e, p } = avecCampagne(27);
    expect(blocCampagnesElectorales(e, "OCC")).toMatch(/Diriger la campagne/);
    const h = campagneHtml(e, "OCC", p.id, p.campagne!.leviers, false);
    expect(h.match(/data-levier=/g)).toHaveLength(4);
    expect(h).toMatch(/Truquer le scrutin/); expect(h).toMatch(/Coup d'État/);
  });
});
