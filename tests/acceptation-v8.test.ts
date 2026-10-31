// Tests d'acceptation de la v8 (25/10/2026) : zones stratégiques, Antarctique sur la carte, 5 niveaux de gravité,
// interactions entre blocs (bras de fer, riposte, diplomatie), effet « ami d'un ami », effets court et long terme.
import { dirigeantsNeutres } from "./neutre";
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  creerPartie, roundAutomatique, finRound, agir, apercuAction, agirZone, peutAgirZone, partFamille, ZONES_STRATEGIQUES, ACTIONS_ZONE,
  GRAVITES, NOMS_GRAVITE, reagir, peutReagir, diplomatie, peutDiplomatie, repondreDiplomatie, alignement, palier, prochesDe, RAPPROCHEMENT,
  PART_IMMEDIATE, DIFFERE, BRAS_DE_FER, type EtatPartie,
} from "../src/moteur/partie";

const SANS_ALEA = { generiques: false, ia: false };
const avecPA = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) { e.camps[c].pa = 20; e.camps[c].budget = 50; e.camps[c].cp = 60; } return dirigeantsNeutres(e); };
const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };

describe("v8", () => {
  it("1. zones stratégiques : 4 zones dont l'Arctique et l'Antarctique, présence achetée, une action par trimestre, comptée au score, érodée", () => {
    expect(ZONES_STRATEGIQUES.map(z => z.id)).toEqual(["arctique", "antarctique", "mer_chine_sud", "golfe_guinee"]);
    const e = avecPA(creerPartie(1, "CHN", SANS_ALEA)), r0 = partFamille(e, "CHN", "ressources");
    const e1 = agirZone(e, "CHN", "arctique", "deploiement");
    expect(e1.zones.arctique.CHN).toBe(e.zones.arctique.CHN + ACTIONS_ZONE.deploiement.gain);
    expect(e1.camps.CHN.points!.defense).toBe(e.camps.CHN.points!.defense - 2); expect(e1.camps.CHN.budget).toBe(e.camps.CHN.budget - 2);
    expect(partFamille(e1, "CHN", "ressources")).toBeGreaterThan(r0);
    expect(peutAgirZone(e1, "CHN", "arctique", "mission")).toMatch(/par trimestre/);
    expect(finRound(e1).zones.arctique.CHN).toBeCloseTo(e1.zones.arctique.CHN - 0.25, 9);
    expect(e.zones.arctique.CHN).toBe(0); // l'état d'entrée n'est pas modifié
  });

  it("2. la carte montre l'Antarctique (aucun pays retiré, cadre jusqu'à 75° sud)", () => {
    const src = readFileSync("src/interface/carte.ts", "utf8");
    expect(src).toMatch(/LAT_SUD = -75/);
    expect(src).toMatch(/SANS = new Set<string>\(\)/);
  });

  it("3. cinq niveaux de gravité, tous observés ; les mineurs sont regroupés à part et ne sont pas réactifs", () => {
    expect(GRAVITES).toHaveLength(5);
    expect(GRAVITES.map(g => NOMS_GRAVITE[g])).toEqual(["mineur", "modéré", "sérieux", "grave", "majeur"]);
    const vus = new Set<number>();
    for (let g = 1; g <= 10; g++) for (const j of jouer(creerPartie(g, null, { generiques: true, ia: false })).journal) if (j.type === "generique" && j.intensite !== undefined) {
      expect(GRAVITES).toContain(j.intensite); vus.add(j.intensite);
      if (j.mineur) { expect(j.intensite).toBe(0.5); expect(j.reactif).toBeFalsy(); }
    }
    expect(vus.size).toBe(5);
  });

  it("4. bras de fer : deux blocs sur le même pays au même trimestre, celui qui y met le plus de PA l'emporte", () => {
    let e = avecPA(creerPartie(2, null, SANS_ALEA));
    e = agir(e, "OCC", "politique", "BRA"); e = agir(e, "OCC", "economique", "BRA"); e = agir(e, "CHN", "politique", "BRA"); // 2 PA contre 1
    const avant = e.pays.BRA.influence.CHN.p, x = finRound(e), j = x.journal.find(j => j.titre === "Bras de fer : Brésil")!;
    expect(j.texte).toMatch(/bloc USA l'emporte/);
    expect(x.pays.BRA.influence.CHN.p).toBeLessThan(avant);
    expect(x.tension).toBeGreaterThanOrEqual(0); expect(BRAS_DE_FER.gain).toBe(2);
  });

  it("5. riposte : contre une action annoncée de l'adversaire, ce trimestre ou le suivant, pas contre la sienne", () => {
    let e = avecPA(creerPartie(3, "CHN", SANS_ALEA));
    e = agir(e, "OCC", "politique", "IDN");
    const i = e.journal.findIndex(j => j.titre.startsWith("Influence politique : ") && j.camp === "OCC");
    expect(peutReagir(e, "OCC", i, "riposter")).toMatch(/action annoncée de l'adversaire/);
    expect(peutReagir(e, "CHN", i, "aider")).toMatch(/riposte/);
    const p0 = e.pays.IDN.influence.OCC.p, r = reagir(e, "CHN", i, "riposter");
    expect(r.pays.IDN.influence.OCC.p).toBeCloseTo(p0 - 3, 9);
    expect(peutReagir(r, "CHN", i, "riposter")).toMatch(/déjà riposté/);
    let suivant = avecPA(finRound(e));
    expect(peutReagir(suivant, "CHN", i, "riposter")).toBeNull();
    suivant = finRound(suivant);
    expect(peutReagir(suivant, "CHN", i, "riposter")).toMatch(/ce trimestre ou le précédent/);
  });

  it("6. diplomatie : une initiative par an ; sanctions immédiates ; offre au joueur acceptée, ou refusée faute de réponse", () => {
    const e = avecPA(creerPartie(4, "OCC", { generiques: false, ia: true }));
    const s = diplomatie(e, "OCC", "sanctions");
    expect(s.camps.CHN.budget).toBe(e.camps.CHN.budget - 3); expect(s.tension).toBe(Math.min(100, e.tension + 4));
    expect(peutDiplomatie(s, "OCC", "sommet")).toMatch(/par an/);
    const o = diplomatie(e, "CHN", "sommet"); // la Chine (IA) propose au joueur
    expect(o.proposition).toMatchObject({ de: "CHN", type: "sommet" });
    const ok = repondreDiplomatie(o, "OCC", true);
    expect(ok.proposition).toBeNull(); expect(ok.tension).toBe(Math.max(0, o.tension - 5));
    const sansReponse = finRound(finRound(o));
    expect(sansReponse.journal.some(j => j.titre === "Sommet : refusé")).toBe(true);
  });

  it("7. ami d'un ami : une bascule entraîne les voisins en différé, lentement (≤ 0,75 par trimestre), plafonné", () => {
    let base = finRound(creerPartie(5, null, SANS_ALEA)); // initialise les paliers
    const iso = Object.keys(base.pays).find(i => i !== "USA" && i !== "CHN" && palier(alignement(base, i)) <= 0 && prochesDe(base, i).voisins.length >= 2)!; expect(iso).toBeDefined();
    let pousse = structuredClone(base); pousse.pays[iso].influence.OCC.p = 100; pousse.pays[iso].influence.OCC.e = 100; pousse.pays[iso].influence.CHN.p = 0;
    const voisin = prochesDe(base, iso).voisins[0];
    pousse = finRound(pousse); base = finRound(base);
    expect(pousse.rapprochements.some(r => r.iso === iso && r.camp === "OCC")).toBe(true);
    let ecartPrec = pousse.pays[voisin].influence.OCC.p - base.pays[voisin].influence.OCC.p;
    expect(Math.abs(ecartPrec)).toBeLessThan(1e-9); // rien le trimestre de la bascule
    for (let r = 0; r < RAPPROCHEMENT.duree + 2; r++) {
      pousse = finRound(pousse); base = finRound(base);
      const ecart = pousse.pays[voisin].influence.OCC.p - base.pays[voisin].influence.OCC.p;
      expect(ecart - ecartPrec).toBeLessThanOrEqual(RAPPROCHEMENT.plafondTrimestre + 1e-9);
      expect(ecart).toBeLessThanOrEqual(RAPPROCHEMENT.voisin + 1e-9);
      ecartPrec = ecart;
    }
    expect(ecartPrec).toBeGreaterThan(0.5);
    for (const c of Object.values(pousse.contagion)) for (const v of Object.values(c)) expect(v).toBeLessThanOrEqual(RAPPROCHEMENT.plafondTotal + 1e-9);
  });

  it("8. court et long terme : 2/3 du gain tout de suite, 1/3 sur 4 trimestres, une conséquence cachée dans ~20 % des actions", () => {
    const e = avecPA(creerPartie(6, "OCC", SANS_ALEA)), p0 = e.pays.BRA.influence.OCC.p, g = 8 * (1 - p0 / 100);
    const x = agir(e, "OCC", "politique", "BRA");
    expect(x.pays.BRA.influence.OCC.p - p0).toBeCloseTo(g * PART_IMMEDIATE, 9);
    const differes = x.attente.filter(a => !a.cache && a.effet.type === "influence");
    expect(differes).toHaveLength(DIFFERE.duree);
    expect(differes.reduce((s, a) => s + (a.effet as { valeur: number }).valeur, 0)).toBeCloseTo(g * (1 - PART_IMMEDIATE), 9);
    expect(apercuAction(e, "OCC", "politique", "BRA")!.alignementDiffere).toBeGreaterThan(0);
    let caches = 0;
    for (let s = 1; s <= 400; s++) caches += agir(avecPA(creerPartie(s, "OCC", SANS_ALEA)), "OCC", "politique", "BRA").attente.filter(a => a.cache).length;
    expect(caches / 400).toBeGreaterThan(0.14); expect(caches / 400).toBeLessThan(0.26);
  }, 60_000);
});
