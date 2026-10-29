// Tests d'acceptation de la v22 (29/10/2026) : présentation des duels (aucun jeu d'origine nommé, illustration,
// démonstration animée qui joue chaque duel jusqu'au bout, repérage des cases qui changent).
import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { DUELS, LISTE_DUELS } from "../src/duels/catalogue";
import { REGLES } from "../src/duels/index";
import { REGLES_TEXTE } from "../src/duels/regles-texte";
import { IMAGE_DUEL, coupDemo, changements } from "../src/interface/duel-anim";
import type { Vue } from "../src/duels/moteur";

const ORIGINES = /Jaipur|Longhorn|7 Wonders|Quarto|Puissance 4|Échecs|Othello|\bCoup\b \(|Skull|Mastermind|Simon|Korsar|Lost Cities|Santorini|Onitama|\bGo\b|Bataille navale|Mémoire 44|Street Fighter|Schotten|Stratego|Perudo|inspiré/;
const alea = (g: number) => () => { g = (g * 1664525 + 1013904223) >>> 0; return g / 4294967296; };

describe("v22 : présentation des duels", () => {
  it("1. aucun texte affiché ne nomme le jeu d'origine", () => {
    for (const id of LISTE_DUELS) {
      const d = DUELS[id] as unknown as Record<string, unknown>, f = REGLES_TEXTE[id];
      expect(d.inspire).toBeUndefined();
      expect(`${d.nom} ${d.situation} ${d.principe} ${f.but} ${f.tour.join(" ")} ${f.fin} ${f.preparation} ${f.conseil}`, id).not.toMatch(ORIGINES);
    }
  });
  it("2. chaque duel a une illustration qui existe", () => {
    expect(Object.keys(IMAGE_DUEL).sort()).toEqual([...LISTE_DUELS].sort());
    for (const id of LISTE_DUELS) expect(existsSync(`src/images/${IMAGE_DUEL[id]}.webp`), id).toBe(true);
  });
  it("3. la démonstration joue chacun des 22 duels avec des coups légaux et avance vraiment", () => {
    for (const id of LISTE_DUELS) {
      const def = REGLES[id], h = alea(7);
      let s = def.creer(12345, 0, { noms: ["Brésil", "Inde", "Nigeria", "Égypte", "Indonésie", "Mexique", "Turquie", "Iran", "Kenya"] }), n = 0;
      while (!s.fini && n < 80) {
        const t0 = Date.now(), c = coupDemo(def, s, h);
        expect(Date.now() - t0, `${id} : coup trop lent`).toBeLessThan(400);
        expect(c, id).not.toBeNull(); expect(def.coups(s), id).toContain(c);
        s = def.jouer(s, c!); n++;
        if (n === 20) expect(s.tour, `${id} : la démo tourne en rond`).toBeGreaterThanOrEqual(3);
      }
      expect(s.tour, id).toBeGreaterThan(0);
      const r = def.resultat(s); expect(r, id).toBeGreaterThanOrEqual(0); expect(r, id).toBeLessThanOrEqual(1);
    }
  }, 60000);
  it("4. cases animées : pion posé « neuf », pion retourné « bascule », rien sur la première vue", () => {
    const a: Vue = { statut: "", grille: { cols: 3, cases: [{ t: "", c: "vide" }, { t: "●", c: "moi" }, { t: "●", c: "lui" }] }, rangees: [{ cases: [{ t: "A", c: "carte" }] }] };
    const b: Vue = { statut: "", grille: { cols: 3, cases: [{ t: "●", c: "moi" }, { t: "●", c: "lui" }, { t: "●", c: "lui" }] }, rangees: [{ cases: [{ t: "B", c: "carte" }] }] };
    const m = changements(a, b);
    expect(m.get("g0")).toBe("neuf"); expect(m.get("g1")).toBe("bascule"); expect(m.has("g2")).toBe(false); expect(m.get("r0_0")).toBe("neuf");
    expect(changements(null, b).size).toBe(0);
  });
});
