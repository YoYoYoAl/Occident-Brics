// Tests d'acceptation de la v34 (30/10/2026) : plus de rappel vers le PIB historique, crises au bon trimestre, pénurie décidée par la partie.
import { describe, it, expect } from "vitest";
import trajectoires from "../src/data/trajectoires.json";
import { existsSync } from "node:fs";
import { IMAGE_DUEL } from "../src/interface/duel-anim";
import { LISTE_DUELS } from "../src/duels/catalogue";
import { LISTE_TRAITS_DIRIGEANT } from "../src/moteur/dirigeants";
import { creerPartie, finRound, pibReference, anneeCroissance, ecartRessources, CENTRAGE, type EtatPartie } from "../src/moteur/partie";

const TRAJ = trajectoires.pays as Record<string, { pib: number[] }>;
const SANS_ALEA = { generiques: false, ia: false, format: "2000-2035" as const };
const avancer = (e: EtatPartie, n: number) => { for (let i = 0; i < n; i++) e = finRound(e); return e; };

describe("v34 : l'histoire fixe le départ, la partie décide la suite", () => {
  it("1. un choc de PIB persiste : aucun rappel vers la trajectoire historique", () => {
    const e = creerPartie(1, null, SANS_ALEA), x = structuredClone(e);
    x.pays.ARG.pib *= 0.2; // le pays perd 80 % de son PIB
    const a = avancer(e, 40), b = avancer(x, 40);
    expect(b.pays.ARG.pib / a.pays.ARG.pib).toBeCloseTo(0.2, 2); // dix ans plus tard, toujours 80 % de moins
  });

  it("2. crises à la bonne date : la récession de 2009 s'étale du 3e trimestre 2008 au 2e trimestre 2009", () => {
    expect(anneeCroissance(2008, 2)).toBe(2007); expect(anneeCroissance(2008, 3)).toBe(2008); expect(anneeCroissance(2009, 2)).toBe(2008); expect(anneeCroissance(2000, 1)).toBe(2000);
    let e = creerPartie(2, null, SANS_ALEA); e = avancer(e, 34); // début 2008 T3
    const t = TRAJ.USA.pib, avant = e.pays.USA.pib; e = avancer(e, 4); // 2008 T3 → 2009 T2
    expect(e.pays.USA.pib / avant).toBeCloseTo(t[9] / t[8], 2); // 2009 < 2008 : la baisse tombe pendant la crise, pas en 2008 T1
    expect(t[9] / t[8]).toBeLessThan(1);
  });

  it("3. PIB de référence : la valeur annuelle tombe au milieu de l'année, départ 2000 inchangé", () => {
    for (const i of ["USA", "CHN", "DEU"]) {
      expect(pibReference(i, 0)).toBeCloseTo(TRAJ[i].pib[0], -3);
      const k = 10, t = TRAJ[i].pib;
      expect(pibReference(i, 4 * k + 6) / pibReference(i, 4 * k + 2)).toBeCloseTo(t[k + 1] / t[k], 9);
    }
  });

  it("4. pas de pénurie sur l'essor historique de la Chine : sans chocs, son PIB suit la tendance", () => {
    let e = creerPartie(3, null, SANS_ALEA); e = avancer(e, 100);
    expect(Math.abs(e.pays.CHN.pib / pibReference("CHN", e.round) - 1)).toBeLessThan(0.02); // avant : −3,5 % dès 2028 par la seule pénurie
    expect(e.pays.CHN.bonus.reduce((s, y) => s + y.points, 0)).toBeGreaterThan(-0.1);
  });

  it("5. la pénurie vient de la partie : un essor sans ressources freine le leader", () => {
    const e = creerPartie(4, null, SANS_ALEA), x = structuredClone(e);
    x.pays.CHN.pib *= 1.5; // la Chine dépasse sa trajectoire sans gagner de ressources
    expect(ecartRessources(x, "CHN")).toBeGreaterThan(ecartRessources(e, "CHN"));
    const a = finRound(e), b = finRound(x);
    expect(b.pays.CHN.bonus.reduce((s, y) => s + y.points, 0)).toBeLessThan(a.pays.CHN.bonus.reduce((s, y) => s + y.points, 0) - 0.1);
  });
  it("6. centrage des chocs : réservé aux parties avec événements aléatoires, sans viser de trajectoire", () => {
    expect(CENTRAGE).toBeGreaterThan(0); expect(CENTRAGE).toBeLessThan(1.5);
    const e = creerPartie(5, null, SANS_ALEA), a = finRound(e);
    expect(a.pays.FRA.pib / e.pays.FRA.pib).toBeCloseTo(pibReference("FRA", 1) / pibReference("FRA", 0), 4);
  });

  it("7. portraits illustrés (lot ob_8) : un par conseiller et par dirigeant, jamais deux fois, sans toucher au hasard", () => {
    const e = creerPartie(6, "OCC", { generiques: true, ia: true });
    const noms = [...Object.values(e.conseillers!.OCC), ...Object.values(e.conseillers!.CHN)].map(k => k!.illustre).concat([e.dirigeants!.OCC.illustre, e.dirigeants!.CHN.illustre]).filter(Boolean) as string[];
    expect(noms.length).toBeGreaterThanOrEqual(13);
    expect(new Set(noms).size).toBe(noms.length);
    for (const n of noms.filter(x => x.startsWith("conseiller"))) expect(existsSync(`src/images/${n}.webp`)).toBe(true);
    const x = creerPartie(6, "OCC", { generiques: true, ia: true }); delete x.imagesPrises;
    expect(JSON.stringify(avancer(x, 2).pays)).toBe(JSON.stringify(avancer(e, 2).pays)); // même partie, mêmes tirages
  });

  it("8. images contrôlées : 22 bandeaux de duel, portraits de dirigeants sans ressemblance retirés (procéduraux)", () => {
    for (const d of LISTE_DUELS) { expect(IMAGE_DUEL[d]).toBe(`duel_${d}`); expect(existsSync(`src/images/duel_${d}.webp`)).toBe(true); }
    expect(LISTE_TRAITS_DIRIGEANT.filter(t => existsSync(`src/images/dirigeant_occ_${t}.webp`))).toHaveLength(24);
    expect(LISTE_TRAITS_DIRIGEANT.filter(t => existsSync(`src/images/dirigeant_chn_${t}.webp`))).toHaveLength(15);
  });
});
