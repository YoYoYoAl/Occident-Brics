// « Améliorer l'armée » selon le pays du jeton (demande du 2 novembre 2026).
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";

const prete = (g = 31) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.points.OCC = 30; e.points.CHN = 0; return e; };
const zoneDe = (e: M.EtatV2, iso: string) => e.pays[iso].zone;

describe("Améliorer l'armée : pays du jeton", () => {
  it("1. sans pays choisi ou sur les États-Unis : l'armée du camp et du leader monte", () => {
    for (const pays of [undefined, "USA"]) {
      const e = prete(), camp = e.militaire.OCC, usa = e.pays.USA.militaire;
      const o = M.engager(e, "OCC", "armee", zoneDe(e, "USA"), 4, pays); expect(o.pays).toBe("USA");
      M.resoudreAnnee(e);
      expect(e.militaire.OCC).toBeGreaterThan(camp); expect(e.pays.USA.militaire).toBeGreaterThan(usa);
    }
  });
  it("2. sur un autre pays (Pologne) : seule l'armée de ce pays monte, la dette du camp aussi", () => {
    const e = prete(), camp = e.militaire.OCC, usa = e.pays.USA.militaire, pol = e.pays.POL.militaire, d = e.monnaie!.dette.OCC;
    const o = M.engager(e, "OCC", "armee", zoneDe(e, "POL"), 4, "POL"); expect(o.pays).toBe("POL");
    M.resoudreAnnee(e);
    expect(e.pays.POL.militaire).toBeGreaterThan(pol);
    expect(e.militaire.OCC).toBe(camp); expect(e.pays.USA.militaire).toBeCloseTo(usa, 0); // seul le lien infrastructures → armée (societe.ts) la fait bouger, de quelques millièmes
    expect(e.monnaie!.dette.OCC).toBeGreaterThan(d);
  });
  it("3. interdit sur le leader adverse, et le pays doit être dans la zone", () => {
    const e = prete();
    expect(M.raisonBlocage(e, "OCC", "armee", zoneDe(e, "CHN"), "CHN")).toMatch(/leader adverse/);
    expect(M.raisonBlocage(e, "OCC", "armee", zoneDe(e, "USA"), "POL")).toMatch(/pas dans la zone/);
  });
  it("4. le texte d'aide parle des deux cas", () => {
    expect(M.op("armee").aide).toMatch(/États-Unis ou Chine/); expect(M.op("armee").aide).toMatch(/autre pays/);
  });
});
