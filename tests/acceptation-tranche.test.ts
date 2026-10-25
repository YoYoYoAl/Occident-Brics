// Tests d'acceptation de la tranche verticale 2000-2008 (document « Règles chiffrées de la tranche 2000-2008 »).
import { describe, it, expect } from "vitest";
import trajectoires from "../src/data/trajectoires.json";
import { FAMILLES } from "../src/contenu/generiques";
import {
  creerPartie, roundAutomatique, finRound, jouerCarte, alignement, bilan, ROUNDS_TRANCHE, type EtatPartie,
} from "../src/moteur/partie";
import { CAMPS, CANAUX } from "../src/moteur/types";

const SANS_ALEA = { generiques: false, ia: false };
const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };
const TRAJ = trajectoires.pays as Record<string, { pib: number[] }>;

describe("Tranche 2000-2008 : moteur", () => {
  it("1. déterminisme : même graine = même partie, l'état d'entrée n'est jamais modifié", () => {
    const a = jouer(creerPartie(42, null)), b = jouer(creerPartie(42, null)), c = jouer(creerPartie(43, null));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
    const e = creerPartie(7, "OCC"), avant = JSON.stringify(e);
    finRound(e);
    expect(JSON.stringify(e)).toBe(avant);
  });

  it("2. sans événements génériques ni IA, le PIB de chaque pays fin 2008 est à ±3 % de la trajectoire réelle", () => {
    const e = jouer(creerPartie(1, null, SANS_ALEA));
    expect(e.round + 1).toBe(ROUNDS_TRANCHE);
    for (const iso of Object.keys(e.pays)) {
      const reel = TRAJ[iso].pib[9]; // niveau annuel 2009 = sortie du 4e trimestre 2008
      expect(Math.abs(e.pays[iso].pib / reel - 1), iso).toBeLessThan(0.03);
    }
  });

  it("3. fréquences des événements génériques à un facteur 2 près du taux calibré (300 parties sans IA)", () => {
    const n = 300, annees = ROUNDS_TRANCHE / 4, compte: Record<string, number> = {};
    for (let g = 1; g <= n; g++) {
      const e = jouer(creerPartie(g, null, { generiques: true, ia: false }));
      for (const j of e.journal) if (j.type === "generique" && j.famille) compte[j.famille] = (compte[j.famille] ?? 0) + 1;
    }
    for (const f of FAMILLES) {
      const observe = (compte[f.id] ?? 0) / (n * annees);
      expect(observe / f.taux, f.id).toBeGreaterThan(0.5);
      expect(observe / f.taux, f.id).toBeLessThan(2);
    }
  }, 120_000);

  it("4. bornes respectées et aucune valeur non finie après 30 parties IA contre IA", () => {
    for (let g = 1; g <= 30; g++) {
      const e = jouer(creerPartie(g, null));
      expect(e.tension).toBeGreaterThanOrEqual(0); expect(e.tension).toBeLessThanOrEqual(100);
      expect(Number.isFinite(e.ecartTemp) && Number.isFinite(e.co2Cumule)).toBe(true);
      for (const c of CAMPS) {
        expect(e.camps[c].cp).toBeGreaterThanOrEqual(0); expect(e.camps[c].cp).toBeLessThanOrEqual(100);
        expect(e.camps[c].budget).toBeGreaterThanOrEqual(0);
      }
      for (const [iso, p] of Object.entries(e.pays)) {
        expect(Number.isFinite(p.pib) && p.pib > 0, iso).toBe(true);
        expect(Number.isFinite(p.population) && p.population > 0, iso).toBe(true);
        expect(p.stabilite).toBeGreaterThanOrEqual(0); expect(p.stabilite).toBeLessThanOrEqual(100);
        const a = alignement(e, iso); expect(a).toBeGreaterThanOrEqual(-1); expect(a).toBeLessThanOrEqual(1);
        for (const c of CAMPS) for (const k of CANAUX) {
          expect(p.influence[c][k]).toBeGreaterThanOrEqual(0); expect(p.influence[c][k]).toBeLessThanOrEqual(100);
        }
      }
      expect(Number.isFinite(bilan(e))).toBe(true);
    }
  }, 60_000);

  it("5. un événement historique déviable dont les conditions tiennent survient dans 90 % ± 5 % des parties", () => {
    const n = 400; let vu = 0;
    for (let g = 1; g <= n; g++) {
      let e = creerPartie(g, null, SANS_ALEA);
      while (e.round < 6) e = finRound(e); // l'OCS est fondée en 2001 T2 (round 5)
      if (e.historiquesFaits.includes("h_ocs")) vu++;
    }
    expect(vu / n).toBeGreaterThan(0.85); expect(vu / n).toBeLessThan(0.95);
  });

  it("6. un effet caché se révèle au round prévu, et seulement au camp concerné", () => {
    for (let g = 1; g <= 200; g++) {
      let e = creerPartie(g, "OCC", SANS_ALEA);
      e.camps.OCC.main = ["o_aide_dev"]; e.camps.OCC.budget = 10;
      e = jouerCarte(e, "OCC", { carte: "o_aide_dev", usage: "evenement", mode: 0, pays: "IND" });
      const prevu = e.attente.find(a => a.cache);
      if (!prevu) continue; // le tirage à 25 % n'a pas donné d'effet caché pour cette graine
      expect(prevu.round).toBe(e.round + 3);
      const r = prevu.round;
      while (e.round < r) {
        expect(e.journal.some(j => j.type === "cache")).toBe(false);
        e = finRound(e);
      }
      const revele = e.journal.filter(j => j.type === "cache");
      expect(revele).toHaveLength(1);
      expect(revele[0].round).toBe(r);
      expect(revele[0].visiblePour).toEqual(["OCC"]);
      return;
    }
    throw new Error("aucun effet caché tiré sur 200 graines");
  });

  it("7. équilibre : aucun camp ne dépasse 70 % de victoires en IA contre IA (150 parties)", () => {
    const n = 150, res: Record<string, number> = {};
    for (let g = 1; g <= n; g++) { const e = jouer(creerPartie(g, null)); res[e.resultat!] = (res[e.resultat!] ?? 0) + 1; }
    expect((res["Victoire de l'Occident"] ?? 0) / n).toBeLessThanOrEqual(0.7);
    expect((res["Victoire de la Chine"] ?? 0) / n).toBeLessThanOrEqual(0.7);
  }, 120_000);

  it("8. une partie complète IA contre IA dure moins de 2 s", () => {
    const t0 = performance.now(); jouer(creerPartie(99, null));
    expect(performance.now() - t0).toBeLessThan(2000);
  });
});
