// Tests d'acceptation de la v33 (30/10/2026) : corrections de l'audit complet (descriptions contre effets réels, conseil des duels, dettes, sauvegardes).
import { describe, it, expect } from "vitest";
import { creerPartie, chargerPartie, serialiserPartie, type EtatPartie } from "../src/moteur/partie";
import { lancerPlan, plansDe, finirPlan, facteurRecompense, OBJECTIFS } from "../src/moteur/plans";
import { payerDettes, issueCampagnes } from "../src/moteur/campagnes";
import { REGLES } from "../src/duels/index";
import { coupDemo, INFO_CACHEE } from "../src/interface/duel-anim";
import { bilanHtml } from "../src/interface/conseil-ui";

const SANS_ALEA = { generiques: false, ia: false };
const riche = (e: EtatPartie) => { e.camps.OCC.budget = 200; e.camps.OCC.cp = 80; return e; };

describe("v33 : audit", () => {
  it("1. récompense d'une orientation : multiplicateur réel ×0,5 / ×1 / ×1,5 selon l'intensité, affiché dans le journal et le bilan", () => {
    for (const [n, f] of [[1, 0.5], [2, 1], [3, 1.5]] as const) {
      const e = lancerPlan(riche(creerPartie(31, "OCC", SANS_ALEA)), "OCC", "commerce", "BRA", 4, n), p = plansDe(e, "OCC")[0];
      expect(facteurRecompense(p)).toBeCloseTo(f, 9); // sans duel joué : résultat moyen 0,5
      const avant = e.pays.BRA.influence.OCC.e; finirPlan(e, p, "reussie");
      expect(e.pays.BRA.influence.OCC.e - avant).toBeCloseTo(12 * f * (1 - avant / 100), 6);
      expect(e.journal[e.journal.length - 1].texte).toMatch(new RegExp(`Effet réel : ×${String(f).replace(".", ",")}`));
      const b = e.bilansPlans![e.bilansPlans!.length - 1]; expect(b.facteur).toBeCloseTo(f, 9);
      expect(bilanHtml(b)).toMatch(/Effet réel/);
    }
  });

  it("2. renverser un régime avec un effet réel sous ×0,5 : le régime vacille mais ne tombe pas (plus de faux « coup d'État »)", () => {
    const e = lancerPlan(riche(creerPartie(32, "OCC", SANS_ALEA)), "OCC", "renverser", Object.keys(creerPartie(32, "OCC", SANS_ALEA).pays).find(i => !["USA", "CHN"].includes(i) && OBJECTIFS.renverser)!, 4, 1);
    const p = plansDe(e, "OCC")[0]; if (!p) return; p.resultats = [0];
    expect(facteurRecompense(p)).toBeLessThan(0.5);
    const avant = structuredClone(e.pays[p.cible]); finirPlan(e, p, "reussie");
    expect(e.journal.some(j => /Le régime vacille/.test(j.titre))).toBe(true);
    expect(e.journal.some(j => /^Coup d'État/.test(j.titre) && j.round === e.round)).toBe(false);
    expect(e.pays[p.cible].influence.OCC.p).toBe(avant.influence.OCC.p);
    expect(e.pays[p.cible].stabilite).toBe(Math.max(0, avant.stabilite - 12));
  });

  it("3. conseil des duels : jamais de lecture des pièces cachées (bataille, combat, intrigue, guerre de l'ombre)", () => {
    expect(INFO_CACHEE).toEqual(expect.arrayContaining(["streetfighter", "coup", "stratego"]));
    const def = REGLES.bataille, a = def.creer(5, 0), b = structuredClone(a);
    b.subs[1] = [0, 1, 2]; a.subs[1] = [33, 34, 35];
    expect(def.aide!(a)).toBe(def.aide!(b)); // même information, même conseil, quelle que soit la position réelle
    const s1 = def.jouer(a, "14"), s2 = def.jouer(b, "14");
    if (s1.tirs[0][14] === s2.tirs[0][14]) expect(def.aide!(s1)).toBe(def.aide!(s2));
    for (const id of INFO_CACHEE) {
      const d = REGLES[id as keyof typeof REGLES], s = d.creer(7, 0); let k = 0;
      const vus = new Set(Array.from({ length: 40 }, () => coupDemo(d, s, () => ((k = (k * 9301 + 49297) % 233280) / 233280))));
      expect(vus.size).toBeGreaterThan(1); // conseil sans essai sur l'état réel : il ne converge pas vers le coup gagnant caché
    }
  });

  it("4. dettes de campagne : chaque campagne paie 4 trimestres, une seconde ne prolonge pas la première", () => {
    const e = riche(creerPartie(34, "OCC", SANS_ALEA)); e.camps.OCC.dettes = [{ parTrimestre: 1, fin: e.round + 4 }];
    const b0 = e.camps.OCC.budget; let payes = 0;
    for (let r = 1; r <= 6; r++) { e.round++; const av = e.camps.OCC.budget; payerDettes(e); payes += av - e.camps.OCC.budget; if (r === 2) (e.camps.OCC.dettes ??= []).push({ parTrimestre: 2, fin: e.round + 4 }); } // au scrutin, la dette naît après le paiement du trimestre
    expect(b0 - e.camps.OCC.budget).toBeCloseTo(payes, 9);
    expect(payes).toBeCloseTo(1 * 4 + 2 * 4, 6); // 1re dette : trimestres 1 à 4 ; 2e : trimestres 3 à 6
    expect(e.camps.OCC.dettes).toHaveLength(0);
    void issueCampagnes;
  });

  it("5. sauvegarde : une version inconnue est refusée avec un message clair, avant toute conversion", () => {
    const x = JSON.parse(serialiserPartie(creerPartie(35, "OCC", SANS_ALEA))); x.version = 99; delete x.conseillers; delete x.pays;
    expect(() => chargerPartie(JSON.stringify(x))).toThrow(/version 99/);
  });
});
