// Tests d'acceptation de la v10 (25/10/2026) : crises en chaîne, rumeurs, ONU, prêts et dette, élections, technologies,
// escalade militaire (intimidation, soutien, putsch, intervention, blocus, course aux armements), guerre entre leaders, crise nucléaire.
import { dirigeantsNeutres } from "./neutre";
import { describe, it, expect } from "vitest";
import {
  creerPartie, finRound, roundAutomatique, agir, peutAgir, electionProchaine, ELECTIONS_PAYS, lobbyOnu, peutLobbyOnu, voteOnu, rechercher, peutRechercher,
  SEUIL_TECHNO, bloquer, peutBloquer, courseArmements, peutArmer, declarerGuerre, peutDeclarerGuerre, proposerPaix, GUERRE, CHAINES, MAX_GENERIQUES_PAYS_AN,
  type EtatPartie,
} from "../src/moteur/partie";

const SANS_ALEA = { generiques: false, ia: false };
const avecPA = (e: EtatPartie) => { for (const c of ["OCC", "CHN"] as const) { e.camps[c].pa = 20; e.camps[c].budget = 60; e.camps[c].cp = 70; } return dirigeantsNeutres(e); };
const jusqua = (e: EtatPartie, r: number) => { while (e.round < r && !e.termine) e = finRound(e); return e; };
const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };

describe("v10", () => {
  it("1. crises en chaîne : seulement après une crise sans réponse, et dans le plafond de 3 événements par pays et par an", () => {
    let chaines = 0;
    for (let g = 1; g <= 20; g++) {
      const e = jouer(creerPartie(g, null, { generiques: true, ia: false }));
      chaines += e.journal.filter(j => j.texte.includes("Conséquence de :")).length;
      const parPaysAn: Record<string, number> = {};
      for (const j of e.journal) if (j.type === "generique" && j.pays?.length === 1 && j.famille) { const k = `${j.pays[0]}|${Math.floor(j.round / 4)}`; parPaysAn[k] = (parPaysAn[k] ?? 0) + 1; }
      for (const [k, n] of Object.entries(parPaysAn)) expect(n, k).toBeLessThanOrEqual(MAX_GENERIQUES_PAYS_AN);
    }
    expect(chaines).toBeGreaterThan(0);
    for (const [a, b] of Object.entries(CHAINES)) expect(a).not.toBe(b);
  }, 60_000);

  it("2. rumeurs : environ la moitié des événements historiques sont annoncés le trimestre d'avant", () => {
    let annonces = 0, total = 0;
    for (let g = 1; g <= 30; g++) {
      const e = jouer(creerPartie(g, null, SANS_ALEA));
      annonces += e.journal.filter(j => j.type === "rumeur").length;
      total += e.journal.filter(j => j.type === "historique").length;
    }
    expect(annonces / total).toBeGreaterThan(0.35); expect(annonces / total).toBeLessThan(0.8);
  }, 60_000);

  it("3. ONU : session ouverte au 2e trimestre, campagnes plafonnées, vote fin du 3e trimestre ; la campagne fait gagner des voix", () => {
    let e = avecPA(jusqua(creerPartie(3, "OCC", SANS_ALEA), 1));
    expect(e.onu?.de).toBe("OCC");
    const base = voteOnu(structuredClone(e)).pour.length;
    e = lobbyOnu(lobbyOnu(e, "OCC"), "OCC");
    expect(peutLobbyOnu(e, "OCC")).toMatch(/au plus/);
    expect(voteOnu(structuredClone(e)).pour.length).toBeGreaterThan(base);
    e = jusqua(e, 3);
    expect(e.journal.some(j => /^ONU : résolution .* (adoptée|rejetée) \(\d+ pour, \d+ contre\)$/.test(j.titre))).toBe(true);
    expect(e.onu).toBeNull();
  });

  it("4. prêts : influence immédiate, issue cachée au bout de 3 ans (remboursement, piège de la dette ou annulation)", () => {
    const issues = new Set<string>();
    for (let g = 1; g <= 60 && issues.size < 2; g++) {
      let e = avecPA(creerPartie(g, "OCC", SANS_ALEA)); e.pays.PAK.stabilite = 20;
      const p0 = e.pays.PAK.influence.OCC.e; e = agir(e, "OCC", "pret", "PAK");
      expect(e.pays.PAK.influence.OCC.e).toBeGreaterThan(p0); expect(e.prets).toHaveLength(1);
      e = jusqua(e, 13);
      const j = e.journal.find(j => /^(Prêt remboursé|Piège de la dette|Dette annulée)/.test(j.titre))!;
      issues.add(j.titre.split(" :")[0]); expect(e.prets).toHaveLength(0);
    }
    expect(issues.size).toBeGreaterThanOrEqual(2);
  });

  it("5. élections : dates réelles, soutien possible dans l'année qui précède, le plus soutenu l'emporte", () => {
    expect(ELECTIONS_PAYS.find(x => x.iso === "BRA" && x.annee === 2002)?.trimestre).toBe(4);
    let e = avecPA(jusqua(creerPartie(4, "OCC", SANS_ALEA), 7)); // 2001 T4 : présidentielle brésilienne d'octobre 2002 dans l'année
    expect(electionProchaine(e, "BRA")?.annee).toBe(2002);
    expect(peutAgir(e, "OCC", "electorale", "FRA")).toBeNull(); // présidentielle française d'avril 2002
    expect(peutAgir(e, "OCC", "electorale", "EGY")).toMatch(/Aucune élection/);
    for (let i = 0; i < 2; i++) { e = agir(e, "OCC", "electorale", "BRA"); e = avecPA(finRound(e)); e = agir(e, "OCC", "electorale", "BRA"); e = avecPA(finRound(e)); }
    e = jusqua(e, 12);
    expect(e.journal.find(j => j.titre === "Élection présidentielle au Brésil")!.texte).toMatch(/bloc USA/);
  });

  it("6. technologies : une percée à 5 points, un investissement par trimestre", () => {
    let e = avecPA(creerPartie(5, "CHN", SANS_ALEA));
    for (let i = 0; i < SEUIL_TECHNO; i++) { e = rechercher(e, "CHN", "biotech"); if (i < SEUIL_TECHNO - 1) { expect(peutRechercher(e, "CHN", "biotech")).toMatch(/par trimestre/); e = avecPA(finRound(e)); } }
    expect(e.camps.CHN.technologies).toEqual(["biotech"]);
    expect(e.journal.some(j => j.titre.startsWith("Percée technologique du bloc Chine"))).toBe(true);
    expect(peutRechercher(e, "CHN", "biotech")).toMatch(/déjà/);
  });

  it("7. escalade militaire : conditions de l'intimidation, du soutien, du putsch et de l'intervention ; blocus et course aux armements", () => {
    let e = avecPA(creerPartie(6, "OCC", SANS_ALEA));
    expect(peutAgir(e, "OCC", "soutien", "BRA")).toMatch(/Échelle de coercition/);
    e.camps.OCC.crans = { VEN: { coop: 0, coer: 2, round: 0 }, OMN: { coop: 3, coer: 0, round: 0 }, DEU: { coop: 0, coer: 1, round: 0 }, BRA: { coop: 0, coer: 1, round: 0 }, GBR: { coop: 0, coer: 2, round: 0 } };
    expect(peutAgir(e, "OCC", "soutien", "GBR")).toMatch(/Échelle de coercition|en conflit/);
    expect(peutAgir(e, "OCC", "putsch", "DEU")).toMatch(/instable/);
    expect(peutAgir(e, "OCC", "intervention", "GBR")).toMatch(/allié/);
    const t0 = e.tension, x = agir(e, "OCC", "intervention", "VEN");
    expect(x.interventions).toHaveLength(1); expect(x.conflits.some(c => c.iso === "VEN")).toBe(true); expect(x.tension).toBeGreaterThanOrEqual(Math.min(100, t0 + 10));
    const fin = jusqua(x, 8);
    expect(fin.journal.some(j => /^Venezuela : (victoire|paix blanche|enlisement)/.test(j.titre))).toBe(true); // v18 : issue selon le score de guerre
    const b = bloquer(e, "OCC", "ormuz");
    expect(b.blocages.some(x => x.detroit === "ormuz")).toBe(true); expect(peutBloquer(b, "CHN", "malacca")).toMatch(/déjà/);
    const a = courseArmements(e, "OCC"); expect(peutArmer(a, "OCC")).toMatch(/par an/);
  });

  it("8. guerre entre leaders : seuils de tension, ruine progressive vers la banqueroute, risque nucléaire croissant, paix possible", () => {
    const e = avecPA(creerPartie(7, "OCC", SANS_ALEA));
    expect(peutDeclarerGuerre(e, "OCC", "taiwan")).toMatch(/tension/);
    e.tension = 85;
    const g = declarerGuerre(e, "OCC", "taiwan");
    expect(g.guerre?.theatre).toBe("taiwan"); expect(g.tension).toBe(100);
    const issues = new Set<string>();
    for (let s = 1; s <= 40; s++) {
      let x = structuredClone(g); x.graine = s; x.alea = s * 7919;
      const pib0 = x.pays.USA.pib; x = finRound(x);
      if (!x.termine) expect(x.pays.USA.pib).toBeLessThan(pib0);
      x = jusqua(x, 36);
      issues.add(x.resultat ?? "");
    }
    expect([...issues].some(r => /Guerre nucléaire/.test(r))).toBe(true);
    expect([...issues].some(r => /banqueroute/.test(r))).toBe(true);
    const p = proposerPaix(g, "CHN"); // l'IA n'y est pas : le joueur reçoit l'offre ; sans IA, conclusion directe
    expect(p.guerre === null || p.proposition?.type === "paix").toBe(true);
    expect(GUERRE.nucleaire).toBeGreaterThan(0);
  }, 60_000);

  it("9. crise nucléaire sans guerre : une tension à 100 fait reculer les deux camps", () => {
    const e = creerPartie(8, "OCC", SANS_ALEA); e.tension = 100;
    const x = finRound(e);
    expect(x.journal.some(j => j.titre.startsWith("Crise nucléaire"))).toBe(true);
    expect(x.tension).toBeLessThan(100);
  });
});
