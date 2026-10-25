// Tests d'acceptation de la tranche verticale 2000-2008 (document « Règles chiffrées de la tranche 2000-2008 »).
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { describe, it, expect } from "vitest";
import trajectoires from "../src/data/trajectoires.json";
import { FAMILLES } from "../src/contenu/generiques";
import {
  creerPartie, roundAutomatique, serialiserPartie, chargerPartie, partFamille, NOMS_FAMILLES, SEUILS, finRound, jouerCarte, alignement, bilan, ROUNDS_TRANCHE, type EtatPartie,
} from "../src/moteur/partie";
import { CAMPS, CANAUX } from "../src/moteur/types";

const SANS_ALEA = { generiques: false, ia: false };
const jouer = (e: EtatPartie) => { while (!e.termine) e = roundAutomatique(e); return e; };
const TRAJ = trajectoires.pays as Record<string, { pib: number[] }>;

describe("Tranche 2000-2008 : moteur", () => {
  it("1. déterminisme : même graine = même partie, l'état d'entrée n'est jamais modifié", () => {
    const a = jouer(creerPartie(42, null)), b = jouer(creerPartie(42, null)), c = jouer(creerPartie(43, null));
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(c));
    const e = creerPartie(7, "OCC"), avant = JSON.stringify(e);
    finRound(e);
    expect(JSON.stringify(e)).toBe(avant);
  });

  it("2. PIB fin 2008 : exact sans aléa (±1 %), et à ±10 % de la trajectoire réelle pour 90 % des pays avec aléas", () => {
    const e = jouer(creerPartie(1, null, SANS_ALEA));
    expect(e.round + 1).toBe(ROUNDS_TRANCHE);
    // un événement historique qui dévie (10 % de hasard) est compensé : ses pays quittent alors la trajectoire réelle, c'est voulu
    const devies = new Set(HISTORIQUES_ERE1.filter(h => h.compensationSiAbsent && !e.historiquesFaits.includes(h.id)).flatMap(h => h.pays));
    for (const iso of Object.keys(e.pays)) {
      if (devies.has(iso)) continue;
      const reel = TRAJ[iso].pib[9]; // niveau annuel 2009 = sortie du 4e trimestre 2008
      expect(Math.abs(e.pays[iso].pib / reel - 1), iso).toBeLessThan(0.01);
    }
    let dans = 0, total = 0;
    for (let g = 1; g <= 40; g++) {
      const x = jouer(creerPartie(g, null, { generiques: true, ia: false }));
      for (const iso of Object.keys(x.pays)) { total++; if (Math.abs(x.pays[iso].pib / TRAJ[iso].pib[9] - 1) <= 0.1) dans++; }
    }
    expect(dans / total).toBeGreaterThanOrEqual(0.9);
  }, 60_000);

  it("3. fréquences des événements génériques à un facteur 2 près du taux calibré (300 parties sans IA)", () => {
    const n = 300, annees = ROUNDS_TRANCHE / 4, compte: Record<string, number> = {};
    for (let g = 1; g <= n; g++) {
      const e = jouer(creerPartie(g, null, { generiques: true, ia: false }));
      for (const j of e.journal) if (j.type === "generique" && j.famille) compte[j.famille] = (compte[j.famille] ?? 0) + 1;
    }
    for (const f of FAMILLES) {
      const observe = (compte[f.id] ?? 0) / (n * annees);
      expect(observe / f.taux, f.id).toBeGreaterThan(0.5);
      expect(observe / f.taux, f.id).toBeLessThan(2);
    }
  }, 120_000);

  it("4. bornes respectées et aucune valeur non finie après 30 parties IA contre IA", () => {
    for (let g = 1; g <= 30; g++) {
      const e = jouer(creerPartie(g, null));
      expect(e.tension).toBeGreaterThanOrEqual(0); expect(e.tension).toBeLessThanOrEqual(100);
      expect(Number.isFinite(e.ecartTemp) && Number.isFinite(e.co2Cumule)).toBe(true);
      for (const c of CAMPS) {
        expect(e.camps[c].cp).toBeGreaterThanOrEqual(0); expect(e.camps[c].cp).toBeLessThanOrEqual(100);
        expect(e.camps[c].budget).toBeGreaterThanOrEqual(0);
      }
      for (const [iso, p] of Object.entries(e.pays)) {
        expect(Number.isFinite(p.pib) && p.pib > 0, iso).toBe(true);
        expect(Number.isFinite(p.population) && p.population > 0, iso).toBe(true);
        expect(p.stabilite).toBeGreaterThanOrEqual(0); expect(p.stabilite).toBeLessThanOrEqual(100);
        const a = alignement(e, iso); expect(a).toBeGreaterThanOrEqual(-1); expect(a).toBeLessThanOrEqual(1);
        for (const c of CAMPS) for (const k of CANAUX) {
          expect(p.influence[c][k]).toBeGreaterThanOrEqual(0); expect(p.influence[c][k]).toBeLessThanOrEqual(100);
        }
      }
      expect(Number.isFinite(bilan(e))).toBe(true);
    }
  }, 60_000);

  it("5. un événement historique déviable dont les conditions tiennent survient dans 90 % ± 5 % des parties", () => {
    const n = 400; let vu = 0;
    for (let g = 1; g <= n; g++) {
      let e = creerPartie(g, null, SANS_ALEA);
      while (e.round < 6) e = finRound(e); // l'OCS est fondée en 2001 T2 (round 5)
      if (e.historiquesFaits.includes("h_ocs")) vu++;
    }
    expect(vu / n).toBeGreaterThan(0.85); expect(vu / n).toBeLessThan(0.95);
  });

  it("6. un effet caché se révèle au round prévu, et seulement au camp concerné", () => {
    for (let g = 1; g <= 200; g++) {
      let e = creerPartie(g, "OCC", SANS_ALEA);
      e.camps.OCC.main = ["o_aide_dev"]; e.camps.OCC.budget = 10;
      e = jouerCarte(e, "OCC", { carte: "o_aide_dev", usage: "evenement", mode: 0, pays: "IND" });
      const prevu = e.attente.find(a => a.cache);
      if (!prevu) continue; // le tirage à 25 % n'a pas donné d'effet caché pour cette graine
      expect(prevu.round).toBe(e.round + 3);
      const r = prevu.round;
      while (e.round < r) {
        expect(e.journal.some(j => j.type === "cache")).toBe(false);
        e = finRound(e);
      }
      const revele = e.journal.filter(j => j.type === "cache");
      expect(revele).toHaveLength(1);
      expect(revele[0].round).toBe(r);
      expect(revele[0].visiblePour).toEqual(["OCC"]);
      return;
    }
    throw new Error("aucun effet caché tiré sur 200 graines");
  });

  it("7. équilibre visé 40 / 20 / 40 en IA contre IA, à 10 points près (200 parties)", () => {
    const n = 200, res: Record<string, number> = {};
    for (let g = 1; g <= n; g++) { const e = jouer(creerPartie(g, null)); res[e.resultat!] = (res[e.resultat!] ?? 0) + 1; }
    console.log("Équilibre IA contre IA :", JSON.stringify(res));
    const part = (k: string) => (res[k] ?? 0) / n;
    expect(Math.abs(part("Victoire du bloc USA") - 0.4)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(part("Victoire du bloc Chine") - 0.4)).toBeLessThanOrEqual(0.1);
    expect(Math.abs(part("Égalité") - 0.2)).toBeLessThanOrEqual(0.1);
  }, 120_000);

  it("8. une partie complète IA contre IA dure moins de 2 s", () => {
    const t0 = performance.now(); jouer(creerPartie(99, null));
    expect(performance.now() - t0).toBeLessThan(2000);
  });

  it("9. une sauvegarde rechargée reprend la partie à l'identique ; une version étrangère est refusée", () => {
    let e = creerPartie(5, "CHN"); for (let i = 0; i < 10; i++) e = roundAutomatique(e);
    const repris = chargerPartie(serialiserPartie(e));
    expect(JSON.stringify(jouer(repris))).toBe(JSON.stringify(jouer(e)));
    expect(() => chargerPartie(JSON.stringify({ ...e, version: 1 }))).toThrow(/version/);
    expect(() => chargerPartie("{}")).toThrow();
  });

  it("10. score composite : 5 familles à parts bornées, leader compté pour son camp, 9 décomptes annuels", () => {
    const e0 = creerPartie(3, "OCC");
    for (const f of Object.keys(NOMS_FAMILLES) as (keyof typeof NOMS_FAMILLES)[]) {
      const o = partFamille(e0, "OCC", f), c = partFamille(e0, "CHN", f);
      expect(o).toBeGreaterThan(0); expect(c).toBeGreaterThan(0); expect(o + c).toBeLessThanOrEqual(1 + 1e-9);
    }
    const e = jouer(e0);
    expect(e.decomptes).toHaveLength(9);
    expect(bilan(e)).toBeCloseTo(e.decomptes.reduce((a, b) => a + b, 0) / 9, 9);
  });

  it("11. la pollution locale d'un pays se dégrade quand ses émissions montent", () => {
    const e = jouer(creerPartie(4, null, SANS_ALEA));
    expect(e.pays.CHN.environnement).toBeLessThan(creerPartie(4, null, SANS_ALEA).pays.CHN.environnement); // émissions chinoises x2 en 2000-2008
  });

  it("12. seuils extrêmes : banqueroute, effondrement démographique, catastrophe climatique", () => {
    const base = creerPartie(6, "OCC", SANS_ALEA);
    const b = structuredClone(base); b.pays.USA.pibMax = b.pays.USA.pib / (SEUILS.banqueroute - 0.05);
    expect(finRound(b).resultat).toMatch(/Défaite du bloc USA : banqueroute/);
    const p = structuredClone(base); p.pays.CHN.population *= SEUILS.population - 0.05;
    expect(finRound(p).resultat).toMatch(/Défaite du bloc Chine : effondrement/);
    const c = structuredClone(base); c.ecartTemp = SEUILS.climat + 1; c.co2Cumule = (SEUILS.climat + 1 - 0.8) / 0.45 * 1000;
    expect(finRound(c).resultat).toMatch(/Catastrophe climatique/);
    expect(finRound(c).termine).toBe(true);
  });

  it("13. influence de départ propre à chaque pays (estimation), et naissance du bloc BRIC en 2006 T3", async () => {
    const { INFLUENCE_2000 } = await import("../src/data/influence2000");
    const e = creerPartie(8, "OCC", SANS_ALEA);
    for (const iso of Object.keys(e.pays)) if (iso !== "USA" && iso !== "CHN") expect(INFLUENCE_2000[iso], iso).toBeDefined();
    expect(e.pays.IRN.influence.OCC.c).toBeLessThanOrEqual(10);
    expect(e.pays.GBR.influence.OCC.c).toBeGreaterThan(e.pays.IRN.influence.OCC.c);
    expect(alignement(e, "IRN")).toBeLessThan(0);
    expect(alignement(e, "GBR")).toBeGreaterThan(0.5);
    let x = e; while (x.round < 26) x = finRound(x); // 2006 T3 = round 26
    expect(x.historiquesFaits.includes("h_bric") || x.journal.some(j => j.titre.includes("naissance du bloc bric"))).toBe(true);
  });
});
