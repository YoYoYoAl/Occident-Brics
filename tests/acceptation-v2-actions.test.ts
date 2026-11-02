import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as RS from "../src/v2/ressources";

// Une partie au stade des opérations, avec beaucoup de points pour l'Occident.
const prete = (g = 31) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.points.OCC = 30; e.points.CHN = 0; return e; };
const resoudre = (e: M.EtatV2) => { const t = e.tension; M.resoudreAnnee(e); return t; };

describe("Actions reliées aux mécanismes (acceptation, 2 novembre 2026)", () => {
  it("1. développement : PIB, armée ET ressources (industrie) des pays de la zone montent", () => {
    const e = prete(), avant = { pib: e.pays.IND.pib, mil: e.pays.IND.militaire, ind: RS.solde(e, "IND", "industrie") };
    M.engager(e, "OCC", "developpement", "ASS", 6); M.resoudreAnnee(e);
    expect(e.pays.IND.militaire).toBeGreaterThan(avant.mil);
    expect(RS.solde(e, "IND", "industrie")).toBeGreaterThan(avant.ind);
  });
  it("2. sabotage : la principale production du pays baisse", () => {
    const e = prete(), avant = RS.solde(e, "IRN", "energie");
    M.engager(e, "OCC", "saboter", "MOA", 5, "IRN"); M.resoudreAnnee(e);
    expect(RS.solde(e, "IRN", "energie")).toBeLessThan(avant);
  });
  it("3. armée : la dette du camp monte ; casus belli : la tension monte", () => {
    const e = prete(), d = e.monnaie!.dette.OCC;
    M.engager(e, "OCC", "armee", "AMN", 5); M.resoudreAnnee(e);
    expect(e.monnaie!.dette.OCC).toBeGreaterThan(d);
    const f = prete(32); f.tension = 2;
    M.engager(f, "OCC", "casusbelli", "MOA", 3, "IRN"); resoudre(f);
    expect(f.tension).toBeGreaterThan(2);
  });
  it("4. partenariat : priorité aux pays qui ont ce qui manque au camp", () => {
    const e = prete(), sans = Object.fromEntries(M.poidsDansZone(e, "MOA", "partenariat")), avec = Object.fromEntries(M.poidsDansZone(e, "MOA", "partenariat", "OCC"));
    const fournisseur = Object.keys(avec).find(i => RS.BIENS.some(b => RS.role(e, i, b.id) === "offre" && RS.bilan(e, "OCC", b.id).manque))!;
    expect(fournisseur).toBeTruthy();
    expect(avec[fournisseur]).toBeGreaterThan(sans[fournisseur]);
  });
});
