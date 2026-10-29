// Tests d'acceptation de la v21 (29/10/2026) : coalitions façon EU4 (méfiance par pays) et alliances à trois niveaux.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, agir, peutAgir, chargerPartie, serialiserPartie, type EtatPartie } from "../src/moteur/partie";
import { gagnerAE, mefiance, suiviExpansion, coalitionDe, coalitionContre, freinCoalition, facteurAE, facteurPlanAE, apaiser, peutApaiser, COALITION, AE, type Intervention } from "../src/moteur/guerre";
import { niveauAlliance, peutSignerAlliance, signerAlliance, rompreAlliance, suiviAlliances, bonusAllies, NIVEAUX, ALLIANCE } from "../src/moteur/alliances";

const SANS_ALEA = { generiques: false, ia: false };
const pencher = (e: EtatPartie, iso: string, occ: number, chn: number) => { for (const c of ["e", "p", "m", "c"] as const) { e.pays[iso].influence.OCC[c] = occ; e.pays[iso].influence.CHN[c] = chn; } };
const neutres = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) e.dirigeants![c].traits = ["stratege", "charismatique"]; return e; };

describe("v21 : coalitions", () => {
  it("1. méfiance : expansion agressive, rancune ×3, penchant ; jamais chez un allié garanti", () => {
    const e = neutres(creerPartie(1, "OCC", SANS_ALEA)); pencher(e, "IRN", 30, 30);
    const m0 = mefiance(e, "OCC", "IRN");
    gagnerAE(e, "OCC", "IRQ", 20); expect(mefiance(e, "OCC", "IRN")).toBeCloseTo(m0 + 20, 6);
    (e.memoire.IRN ??= { OCC: 0, CHN: 0 }).OCC = -5; expect(mefiance(e, "OCC", "IRN")).toBeCloseTo(m0 + 20 + 15, 6);
    pencher(e, "SAU", 90, 0); (e.garanties ??= []).push({ iso: "SAU", camp: "OCC" }); gagnerAE(e, "OCC", "IRQ", 60);
    expect(mefiance(e, "OCC", "SAU")).toBe(0);
  });

  it("2. formation à 3 pays au moins, adhésion à 50, départ sous 35, dissolution sous 2 membres ; chef = plus grande économie", () => {
    const e = neutres(creerPartie(2, "OCC", SANS_ALEA));
    gagnerAE(e, "OCC", "IRQ", 70); suiviExpansion(e);
    const co = coalitionDe(e, "OCC")!;
    expect(co.membres.length).toBeGreaterThanOrEqual(COALITION.minimum);
    expect(co.membres.every(i => mefiance(e, "OCC", i) >= COALITION.depart)).toBe(true);
    expect(e.pays[co.chef!].pib).toBe(Math.max(...co.membres.map(i => e.pays[i].pib)));
    const x = co.membres[0]; pretIntervention(e, x); expect(peutAgir(e, "OCC", "intervention", x)).toMatch(/coalition/);
    expect(facteurPlanAE(e, "OCC", [x])).toBeCloseTo(1 - freinCoalition(co), 9);
    expect(freinCoalition({ ...co, membres: Array(20).fill("X") })).toBe(COALITION.freinMax);
    e.ae = { OCC: {}, CHN: {} }; for (let k = 0; k < 3; k++) suiviExpansion(e);
    expect(coalitionDe(e, "OCC")).toBeNull();
  });

  it("3. la coalition entre dans les guerres proches : score −(3 + 1 par membre) par trimestre, au plus 10", () => {
    const e = neutres(creerPartie(3, "OCC", SANS_ALEA)); gagnerAE(e, "OCC", "IRQ", 70); suiviExpansion(e);
    const co = coalitionDe(e, "OCC")!, n = co.membres.length;
    e.interventions.push({ iso: "IRQ", camp: "OCC", fin: e.round + 7, debut: e.round, score: 0, but: "regime", cb: null } as Intervention);
    suiviExpansion(e);
    expect((e.interventions[0] as Intervention).score).toBeCloseTo(-Math.min(COALITION.riposteMax, COALITION.riposte + COALITION.riposteParMembre * coalitionDe(e, "OCC")!.membres.length), 6);
    expect(n).toBeGreaterThan(0);
    expect(e.journal.some(j => j.titre.startsWith("La coalition entre en guerre"))).toBe(true);
  });

  it("4. apaiser : méfiance −15, 1 budget et 2 capital politique, une fois par pays et par an", () => {
    const e = neutres(creerPartie(4, "OCC", SANS_ALEA)); pencher(e, "IRN", 20, 40); gagnerAE(e, "OCC", "IRQ", 40);
    const m0 = mefiance(e, "OCC", "IRN"), b0 = e.camps.OCC.budget, cp0 = e.camps.OCC.cp, x = apaiser(e, "OCC", "IRN");
    expect(mefiance(x, "OCC", "IRN")).toBeCloseTo(Math.max(0, m0 - COALITION.apaiser.gain), 0);
    expect(x.camps.OCC.budget).toBe(b0 - 1); expect(x.camps.OCC.cp).toBe(cp0 - 2);
    expect(peutApaiser(x, "OCC", "IRN")).toMatch(/par an/);
  });
});

function pretIntervention(e: EtatPartie, iso: string) { const c = e.camps.OCC; c.budget = 100; c.cp = 90; c.points = { ...c.points!, defense: 20 } as typeof c.points; (c.crans ??= {})[iso] = { coop: 0, coer: 2, round: 0 }; }

describe("v21 : alliances", () => {
  it("5. trois niveaux : partenariat (0,20), garantie (0,40, action existante), alliance intégrée (0,60 après la garantie)", () => {
    const e = neutres(creerPartie(5, "OCC", SANS_ALEA)); e.camps.OCC.budget = 50; e.camps.OCC.cp = 80;
    pencher(e, "POL", 25, 20); expect(peutSignerAlliance(e, "OCC", "POL", 1)).toMatch(/pencher/);
    pencher(e, "POL", 70, 5);
    let x = signerAlliance(e, "OCC", "POL", 1); expect(niveauAlliance(x, "OCC", "POL")).toBe(1);
    expect(mefiance(x, "OCC", "POL")).toBeLessThanOrEqual(Math.max(0, mefiance(e, "OCC", "POL") - ALLIANCE.mefiance) + 1e-9);
    expect(peutSignerAlliance(x, "OCC", "POL", 3)).toMatch(/garantie/);
    (x.garanties ??= []).push({ iso: "POL", camp: "OCC" }); expect(niveauAlliance(x, "OCC", "POL")).toBe(2);
    x = signerAlliance(x, "OCC", "POL", 3); expect(niveauAlliance(x, "OCC", "POL")).toBe(3);
    expect(peutSignerAlliance(x, "CHN", "POL", 1)).toMatch(/autre bloc/);
    const b = x.camps.OCC.budget; suiviAlliances(x); expect(x.camps.OCC.budget).toBeCloseTo(b - ALLIANCE.entretien, 9);
    expect(NIVEAUX[3].seuil).toBe(0.6);
  });

  it("6. rupture : capital politique −8, rancune, garantie levée", () => {
    const e = neutres(creerPartie(6, "OCC", SANS_ALEA)); e.camps.OCC.budget = 50; e.camps.OCC.cp = 80; pencher(e, "POL", 70, 5);
    const x = signerAlliance(e, "OCC", "POL", 1); (x.garanties ??= []).push({ iso: "POL", camp: "OCC" });
    const y = rompreAlliance(x, "OCC", "POL");
    expect(niveauAlliance(y, "OCC", "POL")).toBe(0); expect(y.camps.OCC.cp).toBe(x.camps.OCC.cp - ALLIANCE.rupture);
    expect(y.memoire.POL.OCC).toBeLessThan(x.memoire.POL?.OCC ?? 0);
  });

  it("7. alliance intégrée : +2 de score par allié de la région (6 au plus) ; appel à l'aide sans réponse = crédibilité −6", () => {
    const e = neutres(creerPartie(7, "OCC", SANS_ALEA));
    e.alliances = [{ iso: "SAU", camp: "OCC", niveau: 3, depuis: 0 }, { iso: "ARE", camp: "OCC", niveau: 3, depuis: 0 }, { iso: "KWT", camp: "OCC", niveau: 3, depuis: 0 }, { iso: "QAT", camp: "OCC", niveau: 3, depuis: 0 }];
    expect(bonusAllies(e, { iso: "IRQ", camp: "OCC", fin: 8 })).toBe(ALLIANCE.scoreMax);
    expect(bonusAllies(e, { iso: "BRA", camp: "OCC", fin: 8 })).toBe(0);
    e.interventions.push({ iso: "IRQ", camp: "CHN", fin: e.round + 7, debut: e.round - ALLIANCE.appel } as Intervention); // l'Irak est voisin de l'Arabie saoudite et du Koweït
    const cp0 = e.camps.OCC.cp; suiviAlliances(e);
    expect(e.camps.OCC.cp).toBe(cp0 - ALLIANCE.credibilite);
    suiviAlliances(e); expect(e.camps.OCC.cp).toBe(cp0 - ALLIANCE.credibilite); // un seul reproche par intervention
  });

  it("8. IA contre IA 2000-2035 : partenariats signés, aucune erreur ; sauvegarde sans alliances chargée", () => {
    let e = creerPartie(8, null, { generiques: true, ia: true, format: "2000-2035" });
    while (!e.termine) e = finRound(e);
    expect((e.alliances ?? []).length).toBeGreaterThan(0);
    const v = creerPartie(9, "OCC", SANS_ALEA) as Partial<EtatPartie>; delete v.alliances;
    expect(chargerPartie(serialiserPartie(v as EtatPartie)).alliances).toEqual([]);
    expect(AE.seuils[1]).toBe(50); expect(facteurAE(e, "OCC", "BRA")).toBeGreaterThan(0); expect(coalitionContre(e, "OCC", "XXX")).toBeNull();
  }, 120000);
});
