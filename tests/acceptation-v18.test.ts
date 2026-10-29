// Tests d'acceptation de la v18 (29/10/2026) : casus belli, expansion agressive par région, coalitions, score de guerre et paix, dirigeants.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, agir, peutAgir, budgetTrimestre, serialiserPartie, chargerPartie, type EtatPartie } from "../src/moteur/partie";
import { conclureDuel } from "../src/moteur/plans";
import {
  majCasusBelli, casusBelliDe, fabriquerCasusBelli, peutFabriquer, suiviExpansion, gagnerAE, aeDe, facteurAE, facteurPlanAE, zoneDe, coalitionContre,
  signerPaix, peutSignerPaix, CASUS_BELLI, AE, TERMES, SCORE, type Intervention,
} from "../src/moteur/guerre";
import { ZONES } from "../src/moteur/zones";
import { SANTE, normaliserDirigeants, LISTE_TRAITS_DIRIGEANT, aptitude, choisirSuccesseur, succession, suiviDirigeants, maintienAvecPopularite, LISTE_APTITUDES, TRAITS_DIRIGEANT, DIRIGEANT } from "../src/moteur/dirigeants";

const SANS_ALEA = { generiques: false, ia: false };
// Prépare un camp pour intervenir dans un pays : échelle de coercition gravie, points, budget et capital politique.
function pret(e: EtatPartie, iso: string, camp: "OCC" | "CHN" = "OCC") {
  const c = e.camps[camp]; c.budget = 100; c.cp = 90; c.points = { ...c.points!, defense: 20, secret: 20 } as typeof c.points; c.pa = 10;
  (c.crans ??= {})[iso] = { coop: 0, coer: 2, round: e.round }; e.dirigeants![camp].traits = ["stratege", "charismatique"]; return e; // traits sans effet sur l'expansion
}
const ae = (e: EtatPartie, z: string) => aeDe(e, "OCC", z);

describe("v18 : casus belli et expansion agressive", () => {
  it("1. casus belli tirés de la situation : rivalité (tension 80), antiterrorisme (attentat), changement de régime (dirigeant belliciste)", () => {
    const e = creerPartie(1, "OCC", SANS_ALEA);
    e.tension = 85; e.journal.push({ round: e.round, type: "generique", titre: "Attentat", texte: "", famille: "attentat", pays: ["IRQ"], visiblePour: ["OCC", "CHN"] });
    e.dirigeants!.OCC.traits = ["belliciste", "stratege"];
    majCasusBelli(e);
    expect(casusBelliDe(e, "OCC", "CHN")?.type).toBe("rivalite");
    expect(casusBelliDe(e, "OCC", "IRQ")?.type).toBe("antiterrorisme");
    expect(e.casusBelli!.some(c => c.camp === "OCC" && c.type === "regime")).toBe(true);
    expect(e.casusBelli!.some(c => c.camp === "CHN" && c.type === "regime")).toBe(e.dirigeants!.CHN.traits.includes("belliciste"));
    // expiration
    const fin = casusBelliDe(e, "OCC", "IRQ")!.fin; e.round = fin + 1; e.journal = []; majCasusBelli(e);
    expect(casusBelliDe(e, "OCC", "IRQ")).toBeNull();
  });

  it("2. dossier d'ADM fabriqué : budget 2, capital politique 3, un par an ; casus belli ou scandale (environ 30 %)", () => {
    let ok = 0, scandale = 0;
    for (let g = 1; g <= 200; g++) {
      const e = creerPartie(g, "OCC", SANS_ALEA); e.camps.OCC.budget = 10; e.camps.OCC.cp = 50; e.dirigeants!.OCC.traits = ["prudent", "stratege"]; e.dirigeants!.OCC.aptitudes.intrigue = 5;
      const x = fabriquerCasusBelli(e, "OCC", "IRQ");
      expect(x.camps.OCC.budget).toBe(8);
      if (casusBelliDe(x, "OCC", "IRQ")?.type === "adm") { ok++; expect(x.camps.OCC.cp).toBe(47); } else { scandale++; expect(x.camps.OCC.cp).toBe(39); }
      if (g === 1) expect(peutFabriquer(x, "OCC", "SYR")).toMatch(/par an/);
    }
    expect(scandale / 200).toBeGreaterThan(0.2); expect(scandale / 200).toBeLessThan(0.4);
    expect(ok + scandale).toBe(200);
  });

  it("3. intervention sans casus belli : agression (capital politique −10, expansion ×3 : pleine, ½ voisine, ¼ ailleurs)", () => {
    const e = pret(creerPartie(3, "OCC", SANS_ALEA), "IRQ"); e.dirigeants!.OCC.traits = ["stratege", "charismatique"];
    const cp0 = e.camps.OCC.cp, x = agir(e, "OCC", "intervention", "IRQ");
    expect(x.camps.OCC.cp).toBe(cp0 - 5 - AE.cpAgression);
    expect(ae(x, "moyen_orient")).toBeCloseTo(AE.intervention * AE.agression, 6);
    expect(ae(x, "europe")).toBeCloseTo(AE.intervention * AE.agression / 2, 6);
    expect(ae(x, "amerique_latine")).toBeCloseTo(AE.intervention * AE.agression / 4, 6);
    expect(x.journal.some(j => j.titre.startsWith("Agression sans casus belli"))).toBe(true);
    expect((x.interventions[0] as Intervention).cb).toBeNull();
  });

  it("4. intervention avec casus belli humanitaire : expansion ×0,75, casus belli consommé ; pas d'intervention chez une puissance nucléaire", () => {
    const e = pret(creerPartie(4, "OCC", SANS_ALEA), "IRQ"); e.dirigeants!.OCC.traits = ["stratege", "charismatique"];
    e.casusBelli!.push({ camp: "OCC", iso: "IRQ", type: "humanitaire", fin: e.round + 4 });
    const cp0 = e.camps.OCC.cp, x = agir(e, "OCC", "intervention", "IRQ");
    expect(x.camps.OCC.cp).toBe(cp0 - 5);
    expect(ae(x, "moyen_orient")).toBeCloseTo(AE.intervention * CASUS_BELLI.humanitaire.mult, 6);
    expect(casusBelliDe(x, "OCC", "IRQ")).toBeNull();
    pret(e, "RUS"); expect(peutAgir(e, "OCC", "intervention", "RUS")).toMatch(/nucléaire/);
    expect(zoneDe("RUS")).toBe("europe");
  });

  it("5. seuils : 25 = influence −15 % ; 50 = l'adversaire gagne +1 politique chez les 3 plus gros ; déclin 4 en paix (coalitions : v21)", () => {
    const e = creerPartie(5, "OCC", SANS_ALEA); e.dirigeants!.OCC.traits = ["stratege", "charismatique"]; e.dirigeants!.CHN.traits = ["stratege", "charismatique"];
    gagnerAE(e, "OCC", "IRQ", 30);
    expect(facteurAE(e, "OCC", "IRQ")).toBe(AE.malus); expect(facteurAE(e, "OCC", "BRA")).toBe(1);
    gagnerAE(e, "OCC", "IRQ", 30); // 60
    const gros = ["SAU", "TUR", "IRN"].filter(i => e.pays[i]), avant = Object.fromEntries(Object.keys(e.pays).map(i => [i, e.pays[i].influence.CHN.p]));
    suiviExpansion(e);
    const gagnants = Object.keys(e.pays).filter(i => e.pays[i].influence.CHN.p > avant[i] + 0.5);
    const top3 = ZONES.moyen_orient.pays.filter(i => e.pays[i]).sort((a, b) => e.pays[b].pib - e.pays[a].pib).slice(0, 3);
    expect(gagnants).toEqual(expect.arrayContaining(top3));
    expect(ae(e, "moyen_orient")).toBeCloseTo(60 - AE.declinPaix, 6);
    expect(gros.length).toBeGreaterThan(0);
  });
});

describe("v18 : score de guerre et paix", () => {
  it("6. le score évolue chaque trimestre ; bataille décisive du joueur en duel (±30) ; paix achetée avec le score", () => {
    let e = pret(creerPartie(6, "OCC", { generiques: false, ia: true }), "IRQ");
    e = agir(e, "OCC", "intervention", "IRQ");
    e = finRound(finRound(e)); // trimestre de l'entrée en guerre, puis 1er trimestre de combats
    const it = e.interventions.find(i => i.iso === "IRQ") as Intervention;
    expect(it.score).not.toBe(0);
    const d = e.duels!.find(x => x.motif === "bataille")!;
    expect(d).toBeDefined(); expect(d.plan).toBe("guerre:IRQ"); expect(SCORE.batailles).toContain(1);
    const s0 = it.score!, gagne = conclureDuel(e, d.id, 1), perdu = conclureDuel(e, d.id, 0);
    expect((gagne.interventions[0] as Intervention).score).toBeCloseTo(Math.min(100, s0 + SCORE.bataille / 2), 6);
    expect((perdu.interventions[0] as Intervention).score).toBeCloseTo(Math.max(-100, s0 - SCORE.bataille / 2), 6);
    (gagne.interventions[0] as Intervention).score = 70;
    expect(peutSignerPaix(gagne, "OCC", "IRQ", ["regime", "influence"])).toMatch(/insuffisant/);
    const paix = signerPaix(gagne, "OCC", "IRQ", ["regime"]);
    expect(paix.interventions.some(i => i.iso === "IRQ")).toBe(false);
    expect(paix.pays.IRQ.influence.OCC.p).toBeGreaterThanOrEqual(60); expect(paix.pays.IRQ.influence.CHN.p).toBeLessThanOrEqual(15);
    expect(aeDe(paix, "OCC", "moyen_orient")).toBeCloseTo(aeDe(gagne, "OCC", "moyen_orient") + AE.victoire * TERMES.regime.cout, 6);
    // paix blanche toujours possible, même avec un score négatif
    (perdu.interventions[0] as Intervention).score = -40;
    expect(peutSignerPaix(perdu, "OCC", "IRQ", [])).toBeNull();
    expect(peutSignerPaix(perdu, "OCC", "IRQ", ["influence"])).toMatch(/insuffisant/);
  });

  it("7. à l'échéance, les termes sont fixés d'office (victoire) ou c'est l'enlisement (score négatif)", () => {
    for (const score of [80, -50]) {
      let e = pret(creerPartie(7, "OCC", SANS_ALEA), "IRQ");
      e = agir(e, "OCC", "intervention", "IRQ");
      for (let k = 0; k < 7; k++) e = finRound(e);
      (e.interventions[0] as Intervention).score = score; SCORE.alea = 0; const b = SCORE.base; SCORE.base = 0; const f = SCORE.forces; SCORE.forces = 0; const u = SCORE.usure; SCORE.usure = 0;
      try { e = finRound(e); } finally { SCORE.alea = 16; SCORE.base = b; SCORE.forces = f; SCORE.usure = u; }
      expect(e.interventions).toHaveLength(0);
      expect(e.journal.some(j => j.titre.startsWith("Irak") && (score > 0 ? /victoire/ : /enlisement/).test(j.titre))).toBe(true);
    }
  });
});

describe("v18 : dirigeants", () => {
  it("8. profil : 4 aptitudes de 2 à 10 (traits compris, bornées 0-10), 2 traits compatibles, noms fictifs, âge 48-67", () => {
    for (let g = 1; g <= 50; g++) {
      const e = creerPartie(g, "OCC", SANS_ALEA);
      for (const c of ["OCC", "CHN"] as const) {
        const d = e.dirigeants![c];
        for (const a of LISTE_APTITUDES) { expect(d.aptitudes[a]).toBeGreaterThanOrEqual(2); expect(d.aptitudes[a]).toBeLessThanOrEqual(10); expect(aptitude(e, c, a)).toBeGreaterThanOrEqual(0); expect(aptitude(e, c, a)).toBeLessThanOrEqual(10); }
        expect(d.traits).toHaveLength(2); expect(d.traits[0]).not.toBe(d.traits[1]);
        expect(TRAITS_DIRIGEANT[d.traits[0]].contraire).not.toBe(d.traits[1]);
        expect(2000 - d.naissance).toBeGreaterThanOrEqual(48); expect(2000 - d.naissance).toBeLessThanOrEqual(67);
        expect(d.nom).toMatch(/^\S+ \S+$/);
      }
    }
  });

  it("9. effets : intendance ±2 % de budget par point, popularité sur la réélection, traits sur les aptitudes", () => {
    const e = creerPartie(9, "OCC", SANS_ALEA), d = e.dirigeants!.OCC; d.traits = ["prudent", "orateur"];
    d.aptitudes.intendance = 5; const b5 = budgetTrimestre(e, "OCC");
    d.aptitudes.intendance = 10; expect(budgetTrimestre(e, "OCC") / b5).toBeCloseTo(1.1, 1);
    d.traits = ["reformateur", "orateur"]; expect(aptitude(e, "OCC", "intendance")).toBe(10);
    d.popularite = 50; expect(maintienAvecPopularite(e, "OCC", 0.5)).toBeCloseTo(0.5, 9);
    d.popularite = 70; expect(maintienAvecPopularite(e, "OCC", 0.5)).toBeCloseTo(1 / (1 + Math.exp(-1)), 9);
  });

  it("10. succession : 3 candidats, le mieux noté installé, le joueur peut en choisir un autre ; décès à santé nulle", () => {
    const e = creerPartie(10, "OCC", SANS_ALEA);
    succession(e, "OCC", "Test");
    expect(e.succession!.candidats).toHaveLength(DIRIGEANT.candidats);
    expect(e.dirigeants!.OCC.nom).toBe(e.succession!.candidats[0].nom);
    const x = choisirSuccesseur(e, "OCC", 2);
    expect(x.dirigeants!.OCC.nom).toBe(e.succession!.candidats[2].nom); expect(x.succession).toBeNull();
    succession(e, "CHN", "Test"); expect(e.succession?.camp).toBe("OCC"); // l'IA ne laisse pas de choix en suspens
    const y = creerPartie(11, "OCC", SANS_ALEA), nom = y.dirigeants!.CHN.nom; y.dirigeants!.CHN.sante = 0.1; y.dirigeants!.CHN.naissance = 1900; y.round = 4; // 104 ans : santé plafonnée, perte annuelle > 25 // 1er trimestre
    suiviDirigeants(y);
    expect(y.dirigeants!.CHN.nom === nom && y.dirigeants!.CHN.sante > 0).toBe(false);
  });

  it("11. sauvegarde ancienne (sans dirigeants ni expansion) : valeurs par défaut au chargement", () => {
    const e = creerPartie(12, "OCC", SANS_ALEA) as Partial<EtatPartie>;
    delete e.dirigeants; delete e.ae; delete e.casusBelli; delete e.coalitions;
    const x = chargerPartie(serialiserPartie(e as EtatPartie));
    expect(x.dirigeants?.OCC.nom).toBeTruthy(); expect(x.ae).toEqual({ OCC: {}, CHN: {} }); expect(x.casusBelli).toEqual([]);
    expect(finRound(x).round).toBe(x.round + 1);
  });

  it("12. IA contre IA 2000-2035 : des successions, des casus belli, aucune erreur, expansion agressive bornée", () => {
    let e = creerPartie(13, null, { generiques: true, ia: true, format: "2000-2035" }), max = 0;
    while (!e.termine) { e = finRound(e); for (const c of ["OCC", "CHN"] as const) max = Math.max(max, ...Object.values(e.ae![c]), 0); }
    expect(e.journal.filter(j => j.titre.includes("succède")).length).toBeGreaterThanOrEqual(4);
    expect(max).toBeLessThanOrEqual(100);
    expect(e.resultat).toBeTruthy();
  }, 120000);
});

describe("v20 : dirigeants enrichis", () => {
  it("13. 24 traits, plus de trait « malade » ; une sauvegarde qui l'avait est normalisée", () => {
    expect(LISTE_TRAITS_DIRIGEANT).toHaveLength(24);
    expect(LISTE_TRAITS_DIRIGEANT as string[]).not.toContain("malade");
    for (const t of LISTE_TRAITS_DIRIGEANT) { const c = TRAITS_DIRIGEANT[t].contraire; if (c) expect(TRAITS_DIRIGEANT[c], t).toBeDefined(); }
    const e = creerPartie(20, "OCC", SANS_ALEA); (e.dirigeants!.OCC.traits as string[]) = ["malade", "stratege"];
    const x = chargerPartie(serialiserPartie(e));
    expect(x.dirigeants!.OCC.traits).toHaveLength(2); expect(x.dirigeants!.OCC.traits as string[]).not.toContain("malade");
    normaliserDirigeants(x); expect(x.dirigeants!.OCC.traits).toContain("stratege");
  });

  it("14. aptitudes centrées sur 6 : un dirigeant à 16 points ou moins sur 40 reste très rare (< 1 %)", () => {
    let n = 0, faibles = 0, somme = 0;
    for (let g = 1; g <= 600; g++) { const e = creerPartie(g, "OCC", SANS_ALEA);
      for (const c of ["OCC", "CHN"] as const) { const t = LISTE_APTITUDES.reduce((s, a) => s + e.dirigeants![c].aptitudes[a], 0); n++; somme += t; if (t <= 16) faibles++; } }
    expect(faibles / n).toBeLessThan(0.01);
    expect(somme / n).toBeGreaterThan(23); expect(somme / n).toBeLessThan(25);
  }, 60000);

  it("15. maladie = santé : un dirigeant affaibli (santé < 30) perd 1 point d'aptitude, 2 sous 15", () => {
    const e = creerPartie(21, "OCC", SANS_ALEA), d = e.dirigeants!.OCC; d.traits = ["prudent", "orateur"]; d.aptitudes.diplomatie = 6;
    d.sante = 80; expect(aptitude(e, "OCC", "diplomatie")).toBe(6);
    d.sante = SANTE.affaibli - 1; expect(aptitude(e, "OCC", "diplomatie")).toBe(5);
    d.sante = SANTE.grave - 1; expect(aptitude(e, "OCC", "diplomatie")).toBe(4);
    // sur 30 ans, un dirigeant de 70 ans tombe malade au moins une fois (probabilité trimestrielle ≥ 4 %)
    const y = creerPartie(22, "OCC", SANS_ALEA); y.dirigeants!.CHN.naissance = 1930;
    let malade = false; for (let k = 0; k < 120 && !malade; k++) { y.round = k; const avant = y.journal.length; suiviDirigeants(y); malade = y.journal.slice(avant).some(j => j.titre.includes("est malade") || j.titre.includes("meurt")); }
    expect(malade).toBe(true);
  });
});
