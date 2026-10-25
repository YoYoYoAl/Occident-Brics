// Tests d'acceptation de la v9 (25/10/2026) : priorité annuelle, pays au bord de la bascule, investissement durable,
// mémoire cachée des pays, renseignement, agenda secret, dépendance commerciale, usure de l'opinion.
import { describe, it, expect } from "vitest";
import {
  creerPartie, finRound, agir, choisirPriorite, peutChoisirPriorite, BONUS_PRIORITE, PART_IMMEDIATE, DURABLE, auBord, alignement,
  estimationMemoire, renseigner, peutRenseigner, AGENDAS, RECOMPENSE_AGENDA, diplomatie, coutSanctions, dependanceCommerciale, FATIGUE, MEMOIRE,
  nomPays, type EtatPartie,
} from "../src/moteur/partie";
import { CANAUX } from "../src/moteur/types";

const SANS_ALEA = { generiques: false, ia: false };
const avecPA = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) { e.camps[c].pa = 20; e.camps[c].budget = 50; e.camps[c].cp = 60; } return e; };
const jusqua = (e: EtatPartie, r: number) => { while (e.round < r) e = finRound(e); return e; };

describe("v9", () => {
  it("1. priorité annuelle : +25 % sur sa famille d'actions, une par an", () => {
    const e = avecPA(creerPartie(1, "OCC", SANS_ALEA)), p0 = e.pays.BRA.influence.OCC.p, g = 8 * (1 - p0 / 100);
    const r = choisirPriorite(e, "OCC", "rayonnement");
    expect(agir(r, "OCC", "politique", "BRA").pays.BRA.influence.OCC.p - p0).toBeCloseTo(g * BONUS_PRIORITE * PART_IMMEDIATE, 9);
    expect(agir(choisirPriorite(e, "OCC", "economie"), "OCC", "politique", "BRA").pays.BRA.influence.OCC.p - p0).toBeCloseTo(g * PART_IMMEDIATE, 9);
    expect(peutChoisirPriorite(r, "OCC")).toMatch(/par an/);
    expect(peutChoisirPriorite(jusqua(r, 4), "OCC")).toBeNull();
  });

  it("2. pays au bord de la bascule : signalé à moins de 0,03 d'un seuil, avec le bloc qui le ferait basculer", () => {
    const e = creerPartie(2, "OCC", SANS_ALEA), p = e.pays.KEN;
    for (const k of CANAUX) { p.influence.OCC[k] = 6.3; p.influence.CHN[k] = 0; }
    expect(alignement(e, "KEN")).toBeCloseTo(0.09, 2);
    expect(auBord(e, "KEN")).toEqual({ seuil: 0.1, vers: "OCC" });
    for (const k of CANAUX) p.influence.OCC[k] = 17.5; // alignement 0,25 : loin des seuils
    expect(auBord(e, "KEN")).toBeNull();
    expect(auBord(e, "USA")).toBeNull();
  });

  it("3. investissement durable : agir deux trimestres de suite sur un pays renforce de 25 % l'effet long terme", () => {
    let e = avecPA(creerPartie(3, "OCC", SANS_ALEA));
    e = agir(e, "OCC", "politique", "BRA");
    e = avecPA(finRound(e));
    const p = e.pays.BRA.influence.OCC.p, g = 8 * (1 - p / 100), n0 = e.attente.length;
    const x = agir(e, "OCC", "politique", "BRA");
    const nouveaux = x.attente.slice(n0).filter(a => !a.cache);
    expect(nouveaux.reduce((s, a) => s + (a.effet as { valeur: number }).valeur, 0)).toBeCloseTo(g * (1 + DURABLE) * (1 - PART_IMMEDIATE), 9);
  });

  it("4. mémoire cachée : rancune après une déstabilisation, dérive lente de l'influence, estimation seulement", () => {
    const e = avecPA(creerPartie(4, "OCC", SANS_ALEA));
    const d = agir(e, "OCC", "destabiliser", "VEN");
    expect(d.memoire.VEN.OCC).toBeLessThanOrEqual(-2);
    const g = structuredClone(e); g.memoire.BRA = { OCC: 10, CHN: 0 };
    expect(estimationMemoire(g, "BRA", "OCC")).toBe("gratitude");
    expect(estimationMemoire(e, "BRA", "OCC")).toBe("indifférence");
    const a = finRound(g), b = finRound(e);
    expect(a.pays.BRA.influence.OCC.p - b.pays.BRA.influence.OCC.p).toBeCloseTo(MEMOIRE.derive * 10, 6);
    expect(a.memoire.BRA.OCC).toBeCloseTo(10 * (1 - MEMOIRE.oubli), 9);
  });

  it("5. renseignement : révèle les opérations secrètes adverses, la main et l'agenda probable ; un par trimestre", () => {
    for (let g = 1; g <= 50; g++) {
      let e = avecPA(creerPartie(g, "OCC", SANS_ALEA));
      e = agir(e, "CHN", "clandestin", "PAK");
      const op = e.journal.find(j => j.titre.startsWith("Opération secrète") && j.camp === "CHN")!;
      if (op.visiblePour.includes("OCC") || e.journal.some(j => j.titre.startsWith("Scandale"))) continue; // révélée par le hasard
      const r = renseigner(e, "OCC");
      expect(r.journal.find(j => j.titre === op.titre)!.visiblePour).toContain("OCC");
      const rapport = r.journal.find(j => j.titre === "Rapport de renseignement")!;
      expect(rapport.visiblePour).toEqual(["OCC"]); expect(rapport.texte).toMatch(/Main adverse/); expect(rapport.texte).toMatch(/Agenda adverse/);
      expect(r.camps.OCC.pa).toBe(e.camps.OCC.pa - 1);
      expect(peutRenseigner(r, "OCC")).toMatch(/par trimestre/);
      return;
    }
    throw new Error("toutes les opérations ont été révélées");
  });

  it("6. agenda secret : un par bloc et par an, révélé à tous en fin d'année, récompensé s'il est atteint", () => {
    const e = creerPartie(5, "OCC", SANS_ALEA);
    expect(AGENDAS.map(a => a.id)).toContain(e.camps.OCC.agenda!.id);
    expect(e.camps.CHN.agenda).toBeTruthy();
    const zones = AGENDAS.find(a => a.id === "zones")!;
    e.camps.OCC.agenda = { id: "zones", annee: 2000, depart: zones.mesure(e, "OCC") - 20 }; e.camps.OCC.cp = 50;
    const avant = jusqua(e, 3), apres = finRound(avant);
    const j = apres.journal.find(j => j.titre === "Agenda secret du bloc USA : atteint")!;
    expect(j.visiblePour).toEqual(["OCC", "CHN"]);
    expect(apres.journal.some(j => j.titre.startsWith("Agenda secret du bloc Chine"))).toBe(true);
    expect(apres.camps.OCC.agenda!.annee).toBe(2001); // nouvel agenda tiré pour l'année suivante
  });

  it("7. dépendance commerciale : les sanctions coûtent de 1 à 4 à celui qui les impose, selon les échanges", () => {
    const e = avecPA(creerPartie(6, "OCC", { generiques: false, ia: true }));
    const d = dependanceCommerciale(e), cout = coutSanctions(e);
    expect(d).toBeGreaterThan(0); expect(d).toBeLessThanOrEqual(1);
    expect(cout).toBeCloseTo(Math.round((1 + 3 * d) * 10) / 10, 9);
    expect(e.camps.OCC.budget - diplomatie(e, "OCC", "sanctions").camps.OCC.budget).toBeCloseTo(cout, 9);
  });

  it("8. usure de l'opinion : au-delà de 3 engagements récents, le capital politique s'érode ; un sondage avertit", () => {
    const e = creerPartie(7, "OCC", SANS_ALEA); e.camps.OCC.cp = 50;
    const f = structuredClone(e); f.camps.OCC.fatigue = 10;
    const a = finRound(f), b = finRound(e);
    expect(b.camps.OCC.cp - a.camps.OCC.cp).toBeCloseTo(FATIGUE.cout * (10 - FATIGUE.seuil), 6);
    expect(a.camps.OCC.fatigue).toBeCloseTo(10 * (1 - FATIGUE.oubli), 9);
    let x = avecPA(creerPartie(7, "OCC", SANS_ALEA));
    for (const iso of ["POL", "GBR", "JPN", "KOR", "AUS"]) x = agir(x, "OCC", "militaire", iso);
    expect(x.camps.OCC.fatigue).toBe(5);
    expect(finRound(x).journal.some(j => j.titre.startsWith("Sondages") && j.visiblePour.join() === "OCC")).toBe(true);
  });

  it("9. le Soudan du Sud s'appelle Sud-Soudan avant son indépendance de 2011", () => {
    expect(nomPays("SSD")).toBe("Sud-Soudan");
  });
});
