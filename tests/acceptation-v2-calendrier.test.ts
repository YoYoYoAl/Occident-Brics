// Calendrier de l'année (décision du 2 novembre 2026, « Les événements de l'année doivent arriver en fin d'année » / « Événements auto ») :
// le briefing de crise reste au début, les événements automatiques tombent après les opérations et sont montrés avec le bilan.
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
const base = (g: number) => { const e = M.creerPartieV2(g, null as any); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return e; };
const plans = (e: M.EtatV2) => { M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); };
describe("Événements automatiques en fin d'année", () => {
  it("1. début d'année : aucun événement n'est tombé, seul le briefing de crise peut l'être", () => {
    const e = base(7); M.jouerEvenements(e);
    expect(e.evenements).toHaveLength(0);
    expect((e.faits ?? []).filter(f => !f.startsWith("crise_"))).toHaveLength(0);
  });
  it("2. fin d'année : les 12 événements historiques de 2000 tombent pendant la résolution, après les opérations", () => {
    const e = base(7); M.jouerEvenements(e); plans(e);
    const pib = e.pays.USA.pib; M.resoudreAnnee(e);
    expect(e.evenements.filter(x => x.id.startsWith("h_")).length).toBe(12);
    expect(e.pays.USA.pib).not.toBe(pib);
  });
  it("3. une seule fois par année : rappeler la fonction ne rejoue rien", () => {
    const e = base(7); M.jouerEvenements(e); M.evenementsAnnee(e); const n = e.evenements.length, f = (e.faits ?? []).length;
    M.evenementsAnnee(e); plans(e); M.resoudreAnnee(e);
    expect(e.evenements.length).toBeGreaterThanOrEqual(n); expect((e.faits ?? []).filter(x => x.startsWith("h_")).length).toBe((e.faits ?? []).slice(0, f).filter(x => x.startsWith("h_")).length);
  });
  it("4. l'année suivante repart à vide", () => {
    const e = base(7); M.jouerEvenements(e); plans(e); M.resoudreAnnee(e); M.anneeSuivante(e); M.jouerEvenements(e);
    expect(e.annee).toBe(2001); expect(e.evenements).toHaveLength(0);
  });
});
