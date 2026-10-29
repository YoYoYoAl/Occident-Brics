// Tests d'acceptation de la salle des duels (29/10/2026) : chaque mini-jeu se teste hors partie et se note.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { texteAvis } from "../src/interface/salle-duels";
import { LISTE_DUELS } from "../src/duels/catalogue";

describe("salle des duels", () => {
  it("1. accessible depuis l'écran d'accueil, avec les 22 duels", () => {
    expect(readFileSync("src/interface/main.ts", "utf8")).toMatch(/id="salleDuels"/);
    expect(LISTE_DUELS).toHaveLength(22);
  });
  it("2. le texte des avis reprend chaque note, la durée, la difficulté et le commentaire", () => {
    expect(texteAvis({})).toMatch(/Aucun avis/);
    const t = texteAvis({ quarto: { plaisir: 4, clarte: 2, duree: "trop long", difficulte: "bien", commentaire: "règles floues", resultat: 0.75, parties: 2 } });
    expect(t).toMatch(/1\/22/); expect(t).toMatch(/plaisir 4\/5, clarté 2\/5, durée trop long/); expect(t).toMatch(/75 %, 2 parties/); expect(t).toMatch(/« règles floues »/);
  });
});

import { REGLES_TEXTE } from "../src/duels/regles-texte";
describe("règles détaillées des duels", () => {
  it("3. chaque duel a une fiche complète : but, au moins 3 étapes, fin, préparation, conseil", () => {
    for (const id of LISTE_DUELS) { const f = REGLES_TEXTE[id];
      expect(f, id).toBeDefined(); expect(f.tour.length, id).toBeGreaterThanOrEqual(3);
      for (const t of [f.but, f.fin, f.preparation, f.conseil]) expect(t.length, id).toBeGreaterThan(20); }
  });
  it("4. la fiche s'affiche avant la partie (bouton Commencer) et reste consultable en jeu", () => {
    const src = readFileSync("src/interface/duel-ui.ts", "utf8");
    expect(src).toMatch(/id="dCommencer"/); expect(src).toMatch(/Règles complètes/);
    expect(readFileSync("src/interface/plans-ui.ts", "utf8")).toMatch(/Comment marchent les plans/);
  });
});
