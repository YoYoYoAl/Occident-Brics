// Tests d'acceptation des retours du 3e test (25/10/2026) : conditions expliquées, cibles des cartes, carte adverse,
// actions militaires et secrètes, campagnes régionales, concessions, plafond et gravité des événements, crises USA-Chine, briefings 2000.
import { describe, it, expect } from "vitest";
import {
  creerPartie, roundAutomatique, finRound, peutJouerMode, paysEligibles, previsionAdverse, conditionVraie, agir, peutAgir, apercuAction,
  campagne, ZONES, CAMPAGNE, lienFlux, peutReagir, reagir, alignement, carte, type EtatPartie,
} from "../src/moteur/partie";
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { CARTES_ERE1 } from "../src/contenu/cartes";

const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };
const avecPA = (e: EtatPartie, camp: "OCC" | "CHN") => { e.camps[camp].pa = 20; e.camps[camp].budget = 50; return e; };

describe("Retours du 3e test", () => {
  it("1. une condition non réunie est nommée avec sa valeur actuelle ; la liste des cibles ne contient que des pays valides", () => {
    const e = creerPartie(3, "CHN", { generiques: false, ia: false });
    e.camps.CHN.cp = 100;
    const veto = carte("c_veto"), cond = veto.modes[0].conditions!;
    const ok = paysEligibles(e, "CHN", "c_veto", 0);
    expect(ok.length).toBeGreaterThan(0);
    for (const iso of ok) expect(cond.every(c => conditionVraie(e, c, iso)), iso).toBe(true);
    const non = Object.keys(e.pays).find(i => i !== "USA" && i !== "CHN" && !ok.includes(i))!;
    expect(peutJouerMode(e, "CHN", "c_veto", 0, non)).toMatch(/Condition non réunie.*actuel/);
  });

  it("2. une carte adverse annonce ce que l'adversaire en tirerait", () => {
    const e = creerPartie(5, "OCC");
    const adverse = CARTES_ERE1.find(c => c.camp === "CHN")!;
    const p = previsionAdverse(e, "OCC", adverse.id)!;
    expect(p.titre.length).toBeGreaterThan(0);
    expect(previsionAdverse(e, "OCC", CARTES_ERE1.find(c => c.camp === "OCC")!.id)).toBeNull();
  });

  it("3. actions militaires et secrètes : coûts, gains, secret gardé ou révélé (~25 % pour le soutien clandestin)", () => {
    const e = avecPA(creerPartie(2, "OCC", { generiques: false, ia: false }), "OCC");
    const b0 = e.camps.OCC.budget, m0 = e.pays.POL.influence.OCC.m;
    const e1 = agir(e, "OCC", "armes", "POL");
    expect(e1.camps.OCC.budget).toBe(b0 + 1); expect(e1.pays.POL.influence.OCC.m).toBeGreaterThan(m0);
    expect(peutAgir(e, "OCC", "exercices", "IRN")).toMatch(/pencher vers ton bloc/);
    expect(apercuAction(e, "OCC", "politique", "BRA")!.alignement).toBeGreaterThan(0);
    let reveles = 0; const n = 400;
    for (let g = 1; g <= n; g++) {
      const x = avecPA(creerPartie(g, "OCC", { generiques: false, ia: false }), "OCC");
      const y = agir(x, "OCC", "clandestin", "BRA"), nouv = y.journal.slice(x.journal.length);
      expect(nouv[0].visiblePour).toEqual(["OCC"]);
      if (nouv.some(j => j.titre.startsWith("Scandale"))) reveles++;
    }
    expect(reveles / n).toBeGreaterThan(0.18); expect(reveles / n).toBeLessThan(0.32);
  });

  it("4. campagne régionale : tous les pays de la zone gagnent, chacun moins qu'avec une action ciblée", () => {
    const e = avecPA(creerPartie(4, "CHN", { generiques: false, ia: false }), "CHN");
    const e1 = campagne(e, "CHN", "afrique", "e");
    for (const iso of ZONES.afrique.pays) {
      const d = e1.pays[iso].influence.CHN.e - e.pays[iso].influence.CHN.e;
      expect(d).toBeGreaterThan(0); expect(d).toBeLessThanOrEqual(CAMPAGNE.gain.e);
    }
    expect(e1.camps.CHN.pa).toBe(e.camps.CHN.pa - CAMPAGNE.pa);
    expect(() => campagne(e1, "CHN", "afrique", "p")).toThrow(/une campagne par zone/i);
  });

  it("5. concession portuaire : lien de flux +2 pour le bloc pendant 4 ans, puis expiration", () => {
    let e = avecPA(creerPartie(6, "CHN", { generiques: false, ia: false }), "CHN");
    const avant = lienFlux(e, "PAK", "CHN");
    expect(peutAgir(e, "CHN", "infrastructure", "PAK")).toBeNull();
    e = agir(e, "CHN", "infrastructure", "PAK");
    expect(lienFlux(e, "PAK", "CHN")).toBe(avant + 2);
    while (e.round < 17) e = finRound(e);
    expect(e.concessions.length).toBe(0);
    expect(peutAgir(avecPA(e, "CHN"), "CHN", "infrastructure", "ETH")).toMatch(/pas de grand port/);
  });

  it("6. événements : au plus 3 par pays et par an, jamais deux fois la même famille ; des incidents mineurs", () => {
    let mineurs = 0, total = 0;
    for (let g = 1; g <= 20; g++) {
      const e = jouer(creerPartie(g, null));
      const parPaysAn: Record<string, string[]> = {};
      for (const j of e.journal) if (j.type === "generique" && j.pays?.length === 1) {
        (parPaysAn[`${j.pays[0]}|${Math.floor(j.round / 4)}`] ??= []).push(j.famille!); total++; if (j.mineur) mineurs++;
      }
      for (const [k, f] of Object.entries(parPaysAn)) { expect(f.length, k).toBeLessThanOrEqual(3); expect(new Set(f).size, k).toBe(f.length); }
    }
    expect(mineurs / total).toBeGreaterThan(0.2);
  });

  it("7. crise USA-Chine (Hainan) : on peut répondre par la fermeté ou l'apaisement, pas par l'aide", () => {
    let e = creerPartie(1, "CHN", { generiques: false, ia: false });
    while (!e.historiquesFaits.includes("h_hainan") && e.round < 8) e = finRound(e);
    const i = e.journal.findIndex(j => j.source === "h_hainan" && j.round === e.round);
    expect(i).toBeGreaterThanOrEqual(0);
    expect(peutReagir(e, "CHN", i, "fermete")).toBeNull();
    expect(peutReagir(e, "CHN", i, "aider")).toMatch(/fermeté ou l'apaisement/);
    const t0 = e.tension, e2 = reagir(e, "CHN", i, "apaiser");
    expect(e2.tension).toBeLessThan(t0);
  });

  it("8. un briefing dès 2000 pour chaque camp ; au moins 80 événements historiques", () => {
    const c = creerPartie(1, "CHN");
    expect(c.camps.CHN.briefing).toBe("b_c_taiwan_2000");
    let o = creerPartie(1, "OCC"); o = finRound(o);
    expect(o.camps.OCC.briefing).toBe("b_o_commerce_chine");
    expect(HISTORIQUES_ERE1.length).toBeGreaterThanOrEqual(80);
  });
});
