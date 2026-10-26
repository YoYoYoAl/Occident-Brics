// Tests d'acceptation de la v12 (26/10/2026) : budget versé chaque trimestre et dosé pour 4 à 5 des 7 actions, épargne plafonnée, tour guidé.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { creerPartie, finRound, budgetTrimestre, BUDGET, arrondi } from "../src/moteur/partie";

const SANS_ALEA = { generiques: false, ia: false };
const COUT_MOYEN = 1.2; // coût moyen d'une action de domaine pondéré par l'usage (estimation)

describe("v12", () => {
  it("1. budget trimestriel : socle + racine du PIB du leader, versé à chaque trimestre", () => {
    const e = creerPartie(1, "OCC", SANS_ALEA);
    for (const [camp, iso] of [["OCC", "USA"], ["CHN", "CHN"]] as const) {
      expect(budgetTrimestre(e, camp)).toBeCloseTo(arrondi(BUDGET.socle + BUDGET.k * Math.sqrt(e.pays[iso].pib / 1e12)), 9);
      expect(e.camps[camp].budget).toBe(budgetTrimestre(e, camp));
    }
    e.camps.OCC.budget = 1;
    const x = finRound(e);
    expect(x.camps.OCC.budget).toBeCloseTo(arrondi(1 + budgetTrimestre(x, "OCC")), 9); // T2 : nouveau versement, sans attendre l'année suivante
  });

  it("2. dosage : le revenu d'un trimestre finance 4 à 5,5 des 7 actions, pour chaque bloc en 2000", () => {
    const e = creerPartie(2, "OCC", SANS_ALEA);
    for (const camp of ["OCC", "CHN"] as const) {
      const n = budgetTrimestre(e, camp) / COUT_MOYEN;
      expect(n, camp).toBeGreaterThanOrEqual(4); expect(n, camp).toBeLessThanOrEqual(5.5);
    }
  });

  it("3. épargne plafonnée à 2 trimestres de revenu : un levier lourd reste possible, pas de trésor infini", () => {
    const e = creerPartie(3, "OCC", SANS_ALEA); e.camps.OCC.budget = 100;
    const x = finRound(e), q = budgetTrimestre(x, "OCC");
    expect(x.camps.OCC.budget).toBeCloseTo(arrondi(BUDGET.report * q + q), 9);
    expect(x.camps.OCC.budget).toBeGreaterThanOrEqual(8); // une intervention armée coûte 8
  });

  it("4. tour guidé : étapes dans l'ordre événements, carte, défense (qui peut rapporter du budget), économie, diplomatie, secret, bilan ; domaines automatiques sautés ; vue complète possible", () => {
    const src = readFileSync("src/interface/main.ts", "utf8");
    expect(src).toMatch(/ETAPES: Etape\[\] = \["evenements", "carte", "defense", "eco", "diplo", "secret", "bilan"\]/);
    expect(src).toMatch(/modeDe\(e, joueur\(\), x\) !== "auto"/);
    expect(src).toMatch(/id="basculeGuide"/);
  });
});
