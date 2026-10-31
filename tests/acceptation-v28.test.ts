// Tests d'acceptation de la v28 (30/10/2026) : refonte de l'interface, partie 1 (maquettes 1 à 4 validées).
// Séance du conseil convoquée une fois par an, orientations reconduites seulement si la case est cochée, bilan d'orientation,
// impact par cible (carte colorée, opportunités d'abord), recherche par les premières lettres.
import { describe, it, expect } from "vitest";
import { creerPartie, finRound, type EtatPartie } from "../src/moteur/partie";
import {
  lancerPlan, peutLancerPlan, abandonnerPlan, ciblesPossibles, plansDe, avancerPlans, convoquerConseil, peutConvoquer, seanceOuverte,
  basculerReconduite, impactCible, gainEstime, bilansNonVus, marquerBilansVus, coutPlan,
} from "../src/moteur/plans";
import { ciblesClassees, correspond, bilanHtml, listeCibles, salleHtml, ECHELLE } from "../src/interface/conseil-ui";

const SANS_ALEA = { generiques: false, ia: false };
const premier = (e: EtatPartie, o: Parameters<typeof ciblesPossibles>[2]) => ciblesPossibles(e, "OCC", o)[0].id;
const riche = (e: EtatPartie) => { e.camps.OCC.budget = 200; e.camps.CHN.budget = 200; return e; };
// Fait arriver un plan au bout au prochain avancement.
const finir = (e: EtatPartie, id: string) => { const x = structuredClone(e); const p = x.plans!.find(q => q.id === id)!; p.progres = 99.9; p.jalons = 2; avancerPlans(x); return x; };

describe("v28 : salle du conseil et orientations", () => {
  it("1. convoquer le conseil une fois par an hors 1er trimestre : tout devient libre ce trimestre-là", () => {
    const t1 = riche(creerPartie(11, "OCC", SANS_ALEA));
    expect(peutConvoquer(t1, "OCC")).toMatch(/séance annuelle/);
    let e = riche(finRound(t1)); // 2e trimestre
    expect(seanceOuverte(e, "OCC")).toBe(false);
    e = lancerPlan(e, "OCC", "commerce", premier(e, "commerce"), 4, 1);
    expect(peutLancerPlan(e, "OCC", "influence", premier(e, "influence"), 4, 1)).toMatch(/un seul ajustement/);
    e = convoquerConseil(e, "OCC");
    expect(seanceOuverte(e, "OCC")).toBe(true);
    e = lancerPlan(e, "OCC", "influence", premier(e, "influence"), 4, 1);
    e = lancerPlan(e, "OCC", "rayonnement", premier(e, "rayonnement"), 4, 1);
    expect(plansDe(e, "OCC")).toHaveLength(3);
    expect(peutConvoquer(e, "OCC")).toMatch(/déjà réuni/);
    const t3 = riche(finRound(e));
    expect(seanceOuverte(t3, "OCC")).toBe(false);
    expect(peutConvoquer(t3, "OCC")).toMatch(/déjà été convoqué cette année/);
  });

  it("2. une orientation ne repart que si « reconduire » est coché ; le bilan est noté dans les deux cas", () => {
    let e = riche(creerPartie(12, "OCC", SANS_ALEA));
    const c1 = premier(e, "commerce"), z = premier(e, "influence");
    e = lancerPlan(e, "OCC", "commerce", c1, 8, 2, true);
    e = lancerPlan(e, "OCC", "influence", z, 4, 1);
    const [pc, pz] = plansDe(e, "OCC");
    expect(pc.reconduire).toBe(true); expect(pz.reconduire).toBe(false);
    e = finir(finir(e, pc.id), pz.id);
    const restants = plansDe(e, "OCC");
    expect(restants).toHaveLength(1);
    expect(restants[0]).toMatchObject({ objectif: "commerce", cible: c1, duree: 8, intensite: 2, reconduire: true });
    expect(restants[0].progres).toBeLessThan(15); // repartie de zéro (un trimestre d'avance au plus)
    const bl = bilansNonVus(e, "OCC");
    expect(bl.map(b => [b.objectif, b.issue, b.reconduit])).toEqual([["commerce", "reussie", true], ["influence", "reussie", false]]);
    expect(bl[0].depense).toBeGreaterThan(0);
    expect(bl[0].apres.inf).toBeGreaterThan(bl[0].avant.inf); // l'accord commercial augmente l'influence économique
    expect(bilansNonVus(marquerBilansVus(e, "OCC"), "OCC")).toHaveLength(0);
    // décocher en cours de route : l'orientation s'arrête à l'arrivée
    e = basculerReconduite(e, "OCC", restants[0].id);
    e = finir(e, restants[0].id);
    expect(plansDe(e, "OCC")).toHaveLength(0);
  });

  it("3. abandon : bilan « abandonnée », reconduite impossible", () => {
    let e = riche(creerPartie(13, "OCC", SANS_ALEA));
    e = lancerPlan(e, "OCC", "commerce", premier(e, "commerce"), 8, 2, true);
    e = abandonnerPlan(e, "OCC", plansDe(e, "OCC")[0].id);
    const b = bilansNonVus(e, "OCC")[0];
    expect(b).toMatchObject({ issue: "abandonnee", reconduit: false });
    expect(plansDe(e, "OCC")).toHaveLength(0);
    expect(bilanHtml(b)).toMatch(/ABANDONNÉE/);
  });

  it("4. impact des cibles : toutes les cibles possibles classées, 5 crans, le plus fort en premier", () => {
    const e = creerPartie(14, "OCC", SANS_ALEA);
    for (const o of ["commerce", "influence", "contrer", "renverser", "frontiere"] as const) {
      const l = ciblesClassees(e, "OCC", o), ids = ciblesPossibles(e, "OCC", o).map(x => x.id);
      expect(l.map(x => x.id).sort(), o).toEqual([...ids].sort());
      for (let k = 1; k < l.length; k++) { expect(l[k].v, o).toBeLessThanOrEqual(l[k - 1].v); expect(l[k].cran, o).toBeLessThanOrEqual(l[k - 1].cran); }
      if (l.length >= 5) expect(new Set(l.map(x => x.cran)).size, o).toBe(ECHELLE.length);
      for (const x of l) expect(Number.isFinite(x.v) && x.v >= 0, o).toBe(true);
    }
    // un grand pays pèse plus qu'un petit à alignement comparable
    expect(impactCible(e, "OCC", "commerce", "BRA")).toBeGreaterThan(impactCible(e, "OCC", "commerce", "URY"));
  });

  it("5. gain estimé et coût : croissent avec l'intensité et la durée", () => {
    const e = creerPartie(15, "OCC", SANS_ALEA), c = "BRA";
    expect(gainEstime(e, "OCC", "commerce", c, 8, 3)).toBeGreaterThan(gainEstime(e, "OCC", "commerce", c, 8, 1));
    expect(gainEstime(e, "OCC", "commerce", c, 12, 2)).toBeGreaterThan(gainEstime(e, "OCC", "commerce", c, 4, 2));
    expect(gainEstime(e, "OCC", "techno", "CHN", 8, 2)).toBe(0); // pas d'influence pour la course technologique
    expect(coutPlan(e, { objectif: "commerce", intensite: 3, camp: "OCC" })).toBeGreaterThan(coutPlan(e, { objectif: "commerce", intensite: 1, camp: "OCC" }));
  });

  it("6. recherche par les premières lettres, sans accents ; liste : opportunités d'abord", () => {
    expect(correspond("Brésil", "bre")).toBe(true);
    expect(correspond("Afrique du Sud", "sud")).toBe(true);
    expect(correspond("Émirats arabes unis", "emi")).toBe(true);
    expect(correspond("Brésil", "sil")).toBe(false);
    const e = creerPartie(16, "OCC", SANS_ALEA), l = ciblesClassees(e, "OCC", "commerce");
    const h = listeCibles(e, "OCC", l);
    expect(h.indexOf("Meilleures opportunités")).toBeLessThan(h.indexOf("Toutes les cibles"));
    expect(h.indexOf(l[0].nom)).toBeLessThan(h.indexOf("Toutes les cibles"));
  });

  it("7. la salle du conseil s'affiche pour chaque conseil, avec les 6 conseillers et le programme", () => {
    const e = creerPartie(17, "CHN", SANS_ALEA);
    const h = salleHtml(e, "CHN", { etat: () => e, camp: () => "CHN", tenter: () => {}, ouvrir: () => {}, fermer: () => {}, idsJeu: new Map() });
    expect(h.match(/data-conseil=/g)).toHaveLength(6);
    expect(h).toMatch(/Programme 0\/5/);
    expect(h).toMatch(/Clore la séance/);
    expect(h).toMatch(/Reconduire à la fin/);
  });
});
