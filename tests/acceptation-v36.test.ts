// v36 : mini-jeux refaits (31/10) — tutoriel en 3 vignettes et plateau dessiné propre à chaque jeu, sans nom du jeu d'origine.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { TUTOS, tutoHtml } from "../src/interface/duel-tuto";
import { LISTE_DUELS } from "../src/duels/catalogue";
const lire = (f: string) => readFileSync(f, "utf8");
const ORIGINES = ["Jaipur", "Longhorn", "Stratego", "Othello", "Mastermind", "Quarto", "Santorini", "Onitama", "Skull", "Perudo", "Street Fighter", "Lost Cities", "Schotten", "Korsar", "Memoir", "Wonders", "Puissance", "Simon"];

describe("v36", () => {
  it("1. chacun des 22 mini-jeux a un tutoriel de 3 vignettes (but, tour, victoire) avec un schéma", () => {
    expect(LISTE_DUELS.length).toBe(22);
    for (const id of LISTE_DUELS) {
      const t = TUTOS[id]; expect(t, id).toBeDefined(); expect(t!.length, id).toBe(3);
      expect(t!.map(v => v.titre)).toEqual(["Ton but", "À ton tour", "Comment gagner"]);
      for (const v of t!) { expect(v.schema, id).toMatch(/^<svg[^>]*class="tuto-svg"/); expect(v.texte.length, id).toBeGreaterThan(40); expect(v.texte.length, id).toBeLessThan(200); }
    }
  });
  it("2. aucun tutoriel ne cite le nom du jeu d'origine", () => {
    for (const id of LISTE_DUELS) { const h = tutoHtml(TUTOS[id]!); for (const n of ORIGINES) expect(h, `${id} cite ${n}`).not.toContain(n); }
  });
  it("3. les jeux à plateau ont un plateau dessiné dédié, en CSS", () => {
    const css = lire("src/interface/style.css");
    const attendu: Record<string, string> = { echecs: "echiquier", othello: "tapis", go: "mer", santorini: "chantier", onitama: "mer", stratego: "terrain", quarto: "table", bataille: "sonar", longhorn: "tournee", memoire44: "front", simon: "reseau", schotten: "frontiere", puissance4: "p4" };
    for (const [id, c] of Object.entries(attendu)) {
      expect(lire(`src/duels/${id}.ts`), id).toContain(`c: "${c}"`);
      expect(css, c).toMatch(new RegExp(`\\.d-grille\\.${c} \\{`));
    }
  });
  it("4. sur les plateaux dessinés, les jetons des deux camps restent bleu et rouge", () => {
    const css = lire("src/interface/style.css");
    expect(css).toMatch(/\.d-grille:not\(\.echiquier\):not\(\.p4\) \.d-case\.moi \{ background: radial-gradient[^}]*#2f6db5/);
    expect(css).toMatch(/\.d-grille:not\(\.echiquier\):not\(\.p4\) \.d-case\.lui \{ background: radial-gradient[^}]*#c0392b/);
  });
  it("5. journal du front : accord du verbe avec « L'adversaire »", () => {
    expect(lire("src/duels/memoire44.ts")).toMatch(/j === 0 \? "attaquent" : "attaque"/);
  });
});
