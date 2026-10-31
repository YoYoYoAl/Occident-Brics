// v14 : tranche 2008-2035 (départ réel en 2008, partie longue 2000-2035, prolongation d'une partie 2000-2008).
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, FORMATS, formatDe, partKomi, peutProlonger, prolonger, ELECTIONS_PAYS, HISTORIQUES, DELTAS_2008, type EtatPartie } from "../src/moteur/partie";
import { HISTORIQUES_ERE2 } from "../src/contenu/historiques2";
import { CARTES_ERE2 } from "../src/contenu/cartes2";
import { BRIEFINGS_ERE2 } from "../src/contenu/briefings2";
import { CARTES_ERE1 } from "../src/contenu/cartes";
import trajectoires from "../src/data/trajectoires.json";

const TRAJ = trajectoires.pays as Record<string, { pib: number[]; population: number[] }>;
const sansIA = { generiques: false, ia: false };
const jusque = (e: EtatPartie, r: number) => { while (e.round < r && !e.termine) e = finRound(e); return e; };

describe("v14 — tranche 2008-2035", () => {
  it("1. contenu de l'ère 2 : 28 historiques datés 2009-2024, 22 cartes, 10 briefings, identifiants uniques", () => {
    expect(HISTORIQUES_ERE2).toHaveLength(28);
    expect(HISTORIQUES_ERE2.every(h => h.annee >= 2009 && h.annee <= 2024)).toBe(true);
    expect(CARTES_ERE2).toHaveLength(22);
    expect(BRIEFINGS_ERE2).toHaveLength(10);
    const ids = [...HISTORIQUES.map(h => h.id), ...CARTES_ERE1.map(c => c.id), ...CARTES_ERE2.map(c => c.id), ...BRIEFINGS_ERE2.map(b => b.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("2. départ 2008 : 1er trimestre 2008, PIB et population à 2 % près du réel, mains et budgets prêts, déterministe", () => {
    const e = creerPartie(7, "CHN", { generiques: true, ia: true, format: "2008-2035" });
    expect(e.round).toBe(32);
    for (const iso of ["USA", "CHN", "IND", "DEU", "RUS", "BRA", "JPN"]) {
      expect(Math.abs(e.pays[iso].pib / TRAJ[iso].pib[8] - 1)).toBeLessThan(0.02);
      expect(Math.abs(e.pays[iso].population / TRAJ[iso].population[8] - 1)).toBeLessThan(0.02);
    }
    for (const c of ["OCC", "CHN"] as const) { expect(e.camps[c].main).toHaveLength(6); expect(e.camps[c].budget).toBeGreaterThan(5); }
    expect(e.decomptes).toEqual([]);
    expect(e.journal.every(j => j.round === 32)).toBe(true);
    expect(e.historiquesFaits).toContain("h_11_septembre");
    expect(JSON.stringify(creerPartie(7, "CHN", { generiques: true, ia: true, format: "2008-2035" }))).toBe(JSON.stringify(e));
    expect(DELTAS_2008.every(d => d.d !== 0 && d.raison.length > 0)).toBe(true);
  });

  it("3. ère 2 : nouveau paquet en 2009 et événements réels 2009-2011", () => {
    let e = jusque(creerPartie(3, null, { ...sansIA, format: "2008-2035" }), 36);
    const ids2 = new Set(CARTES_ERE2.map(c => c.id));
    expect([...e.pioche, ...e.camps.OCC.main, ...e.camps.CHN.main].some(id => ids2.has(id))).toBe(true);
    e = jusque(e, 48);
    // événements déviables (90 %) : au moins 3 des 4 sur cette graine, et chacun sur au moins une des graines 3 à 7
    const ids = ["h_bric_sommet", "h_printemps_arabe", "h_fukushima", "h_intervention_libye"];
    expect(ids.filter(id => e.historiquesFaits.includes(id)).length).toBeGreaterThanOrEqual(3);
    const vus = new Set<string>(); for (let g = 3; g < 8; g++) jusque(creerPartie(g, null, { ...sansIA, format: "2008-2035" }), 48).historiquesFaits.forEach(id => vus.add(id));
    for (const id of ids) expect(vus).toContain(id);
  });

  it("4. partie longue et départ 2008 vont jusqu'au 4e trimestre 2035 sans valeur manquante", () => {
    for (const format of ["2000-2035", "2008-2035"] as const) {
      const e = jusque(creerPartie(11, null, { generiques: true, ia: true, format }), 200);
      expect(e.termine).toBe(true);
      if (!/Défaite|Catastrophe/.test(e.resultat!)) { expect(e.round).toBe(143); expect(e.decomptes).toHaveLength((144 - FORMATS[format].debut) / 4); }
      expect(Object.values(e.pays).every(p => Number.isFinite(p.pib) && Number.isFinite(p.population))).toBe(true);
      expect(e.decomptes.every(Number.isFinite)).toBe(true);
    }
  }, 60_000);

  it("5. une partie 2000-2008 terminée aux points se prolonge jusqu'en 2035, komi converti", () => {
    const e = jusque(creerPartie(5, "OCC", { generiques: true, ia: true }), 99);
    expect(e.round).toBe(35);
    expect(peutProlonger(e)).toBe(true);
    const p = prolonger(e), a = FORMATS["2000-2008"], b = FORMATS["2000-2035"];
    expect(p.round).toBe(36); expect(p.termine).toBe(false); expect(formatDe(p).fin).toBe(143);
    expect(p.decomptes[8] - e.decomptes[8]).toBeCloseTo(36 * (b.komi / 144 - a.komi / 36), 9);
    expect(peutProlonger(p)).toBe(false);
    expect(partKomi(b)).toBeCloseTo(37 / 72, 9);
  });

  it("6. élections des pays clés : dates réelles jusqu'en 2026 puis projetées jusqu'en 2035, au plus une par pays et par an", () => {
    const apres = ELECTIONS_PAYS.filter(x => x.annee >= 2009);
    expect(apres.length).toBeGreaterThanOrEqual(80);
    expect(ELECTIONS_PAYS.every(x => x.annee >= 2000 && x.annee <= 2035)).toBe(true);
    const cles = ELECTIONS_PAYS.map(x => `${x.iso}:${x.annee}`);
    expect(new Set(cles).size).toBe(cles.length);
    for (const iso of ["RUS", "TWN", "FRA", "DEU", "BRA", "IND", "GBR", "JPN"]) expect(apres.some(x => x.iso === iso)).toBe(true);
  });
});

describe("v14 — équilibre des nouveaux formats (contrôle léger ; calibrage complet : 200 parties par format)", () => {
  it("7. départ 2008 en IA contre IA : chaque camp gagne entre 15 et 65 % de 24 parties", () => {
    const n = 24, res: Record<string, number> = {};
    for (let g = 1001; g < 1001 + n; g++) { const e = jusque(creerPartie(g, null, { generiques: true, ia: true, format: "2008-2035" }), 200); res[e.resultat!] = (res[e.resultat!] ?? 0) + 1; }
    console.log("Équilibre 2008-2035 :", JSON.stringify(res));
    for (const k of ["Victoire du bloc USA", "Victoire du bloc Chine"]) { const p = (res[k] ?? 0) / n; expect(p).toBeGreaterThanOrEqual(0.15); expect(p).toBeLessThanOrEqual(0.65); }
  }, 300_000);
});

describe("v14 — illustrations de l'ère 2", () => {
  it("8. chaque événement et chaque carte de l'ère 2 a une illustration existante", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/interface/images.ts", "utf8");
    const ids = [...HISTORIQUES_ERE2.map(h => h.id), ...CARTES_ERE2.map(c => c.id)];
    for (const id of ids) {
      const m = src.match(new RegExp(`\\b${id}: "([a-z0-9_]+)"`));
      expect(m, id).not.toBeNull();
      expect(readFileSync(`src/images/${m![1]}.webp`, "utf8").length, id).toBeGreaterThan(1000);
    }
  });
});
