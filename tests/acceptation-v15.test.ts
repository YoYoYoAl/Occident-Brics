// v15 : histoire réelle 2025-octobre 2026 et projections jusqu'en 2035.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, HISTORIQUES, ELECTIONS_PAYS, pibReference, tolerancePib, type EtatPartie } from "../src/moteur/partie";
import { CROISSANCE_PROJETEE } from "../src/data/croissance-projetee";
import { HISTORIQUES_RECENTS } from "../src/contenu/historiques3";
import { PROJECTIONS } from "../src/contenu/projections";

const jusque = (e: EtatPartie, r: number) => { while (e.round < r && !e.termine) e = finRound(e); return e; };

describe("v15 — 2025 à 2035", () => {
  it("1. faits réels datés de 2025 à octobre 2026, sans probabilité ; projections de fin 2026 à 2035, marquées et probabilisées", () => {
    expect(HISTORIQUES_RECENTS.length).toBeGreaterThanOrEqual(20);
    for (const h of HISTORIQUES_RECENTS) { expect(h.probabilite).toBeUndefined(); expect(h.annee * 4 + h.trimestre).toBeLessThanOrEqual(2026 * 4 + 4); expect(h.annee).toBeGreaterThanOrEqual(2025); }
    expect(PROJECTIONS.length).toBeGreaterThanOrEqual(15);
    for (const p of PROJECTIONS) {
      expect(p.texte.startsWith("Scénario projeté.")).toBe(true);
      expect(p.probabilite).toBeGreaterThan(0); expect(p.probabilite).toBeLessThan(1);
      expect(p.annee * 4 + p.trimestre).toBeGreaterThanOrEqual(2026 * 4 + 4); expect(p.annee).toBeLessThanOrEqual(2035);
    }
    const ids = HISTORIQUES.map(h => h.id); expect(new Set(ids).size).toBe(ids.length);
  });

  it("2. une partie longue sans IA rejoue les faits de 2025-2026 et ne tire qu'une partie des projections, sans les annoncer quand elles n'ont pas lieu", () => {
    const e = jusque(creerPartie(4, null, { generiques: false, ia: false, format: "2000-2035" }), 200);
    expect(e.round).toBe(143);
    for (const id of ["h_liberation_day", "h_fin_new_start", "h_retrait_oms"]) expect(e.historiquesFaits).toContain(id);
    const faites = PROJECTIONS.filter(p => e.historiquesFaits.includes(p.id)).length;
    expect(faites).toBeLessThan(PROJECTIONS.length);
    const silencieuses = PROJECTIONS.filter(p => !e.historiquesFaits.includes(p.id));
    expect(e.journal.some(j => silencieuses.some(p => j.source === p.id))).toBe(false);
  }, 60_000);

  it("3. sur 40 parties, la fréquence d'une projection suit sa probabilité (Lune chinoise, p = 0,6, à ±0,25)", () => {
    let n = 0;
    for (let g = 1; g <= 40; g++) { const e = jusque(creerPartie(g, null, { generiques: false, ia: false, format: "2008-2035" }), 200); if (e.historiquesFaits.includes("p_lune_chine")) n++; }
    expect(Math.abs(n / 40 - 0.6)).toBeLessThanOrEqual(0.25);
  }, 300_000);

  it("4. élections : présidentielle brésilienne d'octobre 2026, calendrier projeté jusqu'en 2035", () => {
    expect(ELECTIONS_PAYS.some(x => x.iso === "BRA" && x.annee === 2026 && x.trimestre === 4)).toBe(true);
    expect(ELECTIONS_PAYS.filter(x => x.annee > 2026).length).toBeGreaterThanOrEqual(40);
  });

  it("5. PIB de référence : croissance FMI (ou estimation) après 2022, tolérance 10 % jusqu'en 2026 puis 35 % fin 2035", () => {
    const src = Object.values(CROISSANCE_PROJETEE);
    expect(src.filter(c => c.source === "fmi").length).toBe(83);
    expect(src.every(c => c.g.every(Number.isFinite) && c.g[3] > -5 && c.g[3] < 12)).toBe(true);
    const [g23, g24, g25, gm] = CROISSANCE_PROJETEE.CHN.g.map(x => 1 + x / 100);
    expect(pibReference("CHN", 4 * 26) / pibReference("CHN", 4 * 22)).toBeCloseTo(g23 * g24 * g25 * gm, 9);
    expect(pibReference("CHN", 4 * 35) / pibReference("CHN", 4 * 26)).toBeCloseTo(Math.pow(gm, 9), 9);
    expect(tolerancePib(0)).toBe(0.1); expect(tolerancePib(4 * 27)).toBe(0.1);
    expect(tolerancePib(4 * 36)).toBeCloseTo(0.35, 9); expect(tolerancePib(143)).toBeGreaterThan(0.34);
  });
});
