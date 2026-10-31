// Tests d'acceptation de la v32 (30/10/2026) : décors des mini-jeux (maquette 8).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { DUELS } from "../src/duels/catalogue";
import { DECORS, DECOR_DUEL, banniereDuel } from "../src/interface/duel-ui";

const css = readFileSync("src/interface/style.css", "utf8");
describe("v32 : décors des mini-jeux", () => {
  it("1. chacun des 22 duels a un décor parmi les 6 ; chaque décor sert au moins une fois", () => {
    const ids = Object.keys(DUELS) as (keyof typeof DECOR_DUEL)[];
    expect(ids).toHaveLength(22);
    for (const id of ids) expect(Object.keys(DECORS)).toContain(DECOR_DUEL[id]);
    expect(new Set(ids.map(i => DECOR_DUEL[i])).size).toBe(6);
  });
  it("2. chaque décor a son thème CSS complet ; les couleurs des camps ne sont pas écrasées", () => {
    for (const d of Object.keys(DECORS)) for (const v of ["--dc-fond", "--dc-accent", "--dc-case"]) expect(css).toMatch(new RegExp(`\\.decor-${d} \\{[^}]*${v}`));
    expect(css).toMatch(/:where\(\.duel\[class\*="decor-"\]\) \.d-case \{/);
  });
  it("3. les décors des maquettes : élection en studio, putsch en état-major, sous-marin au sonar, crise nucléaire au bord du gouffre", () => {
    expect(DECOR_DUEL.puissance4).toBe("studio"); expect(DECOR_DUEL.echecs).toBe("etatmajor"); expect(DECOR_DUEL.bataille).toBe("sonar");
    expect(DECOR_DUEL.jaipur).toBe("marche"); expect(DECOR_DUEL.perudo).toBe("gouffre"); expect(DECOR_DUEL.othello).toBe("place");
  });
  it("4. le bandeau n'affiche jamais le jeu d'origine", () => {
    for (const id of Object.keys(DUELS) as (keyof typeof DECOR_DUEL)[]) expect(banniereDuel(id, "x").replace(/<[^>]*>/g, " ").toLowerCase()).not.toMatch(/échecs|othello|puissance 4|\bgo\b|mastermind|stratego|perudo|jaipur|santorini|onitama|street fighter|bataille navale/);
  });
});
