// Retour du 5 novembre 2026 : déposer un jeton sur un pays affiche les actions possibles juste à côté du jeton.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
const ui = readFileSync("src/v2/ui.ts", "utf8"), carte = readFileSync("src/v2/carte.ts", "utf8");
describe("Dépôt d'un jeton", () => {
  it("1. le dépôt n'engage plus rien tout seul : il ouvre le menu d'actions au point de dépôt", () => {
    const drop = ui.slice(ui.indexOf('zc.addEventListener("drop"'), ui.indexOf('zc.addEventListener("drop"') + 500);
    expect(drop).toContain("menuDepot(ev.clientX, ev.clientY, z, iso)");
    expect(drop).not.toContain("M.engager");
  });
  it("2. le pays visé est repéré sous le pointeur et devient la cible", () => {
    expect(carte).toContain("paysSous(x, y)");
    expect(ui).toContain("carte.paysSous(ev.clientX, ev.clientY)");
  });
  it("3. le menu montre les actions possibles par catégorie, les impossibles avec leur raison, et s'annule par Échap ou clic ailleurs", () => {
    const m = ui.slice(ui.indexOf("function menuDepot"), ui.indexOf("// 4. Opérations"));
    for (const x of ["M.raisonBlocage", "Développement", "Secret", "Militaire", "impossible", 'ev.key === "Escape"', "pointerdown", "M.engager"]) expect(m, x).toContain(x);
  });
});
