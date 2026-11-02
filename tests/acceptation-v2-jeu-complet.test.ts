// Jeu complet v2 (choix de l'utilisateur du 2 novembre 2026 : la v2 devient le jeu public) : années enchaînées jusqu'en 2050,
// décomptes tous les 5 ans, écran final, sauvegarde et reprise, graine au hasard, publication (v2 à la racine, ancien jeu sous /ancien/).
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import * as M from "../src/v2/moteur";

const annee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); return M.anneeSuivante(e); };
const partie = (g: number) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return e; };
describe("Jeu complet v2", () => {
  it("1. une partie va de 2000 à 2050 avec 11 décomptes (2004, 2009… 2049, puis 2050 final)", () => {
    const e = partie(901); while (!e.fin) annee(e);
    expect(e.annee).toBe(M.ANNEE_FIN);
    expect(e.decomptes!.map(d => d.annee)).toEqual([2004, 2009, 2014, 2019, 2024, 2029, 2034, 2039, 2044, 2049, 2050]);
    expect(e.decomptes![e.decomptes!.length - 1].final).toBe(true);
  });
  it("2. sauvegarde : l'état repris (JSON) rejoue exactement la même suite de partie", () => {
    const e = partie(902); for (let i = 0; i < 6; i++) annee(e);
    const c = JSON.parse(JSON.stringify(e)) as M.EtatV2;
    for (let i = 0; i < 8; i++) { annee(e); annee(c); }
    expect(JSON.stringify(c)).toBe(JSON.stringify(e));
    expect(JSON.stringify(e).length).toBeLessThan(2_000_000); // tient dans le stockage du navigateur
  });
  it("3. l'interface enchaîne les années, montre les décomptes et la fin, sauvegarde et propose la reprise", () => {
    const ui = readFileSync("src/v2/ui.ts", "utf8");
    for (const x of ["function anneeNouvelle", "M.anneeSuivante(e)", "function ecranDecompte", "function finPartie", "function sauver", "partieSauvee()", "v2-reprise", "Passer en ${e.annee + 1}", "an.textContent = String(e.annee)"]) expect(ui, x).toContain(x);
    expect(ui).not.toContain("Rejouer l'année");
  });
  it("4. graine au hasard à chaque partie ; la démo (graine 2000, guerre Russie-Géorgie) seulement avec ?demo", () => {
    const ui = readFileSync("src/v2/ui.ts", "utf8");
    expect(ui).toMatch(/Math\.random\(\) \* 999_999/); expect(ui).toContain("if (DEMO) guerreDemo()"); expect(ui).toContain('PARAMS.get("graine")');
  });
  it("5. publication : la v2 à la racine du site, l'ancien jeu sous /ancien/, lien depuis l'accueil", () => {
    const y = readFileSync(".github/workflows/publier.yml", "utf8");
    expect(y).toContain("npx vite build --outDir dist/ancien"); expect(y).toContain("vite.maquette.config.ts"); expect(y).toContain("mv dist/maquette.html dist/index.html");
    expect(readFileSync("src/v2/ui.ts", "utf8")).toContain('href="ancien/"');
    expect(readFileSync("maquette.html", "utf8")).toContain("<title>Occident contre BRICS</title>");
  });
  it("6. 3 emplacements de sauvegarde : sauver, charger, écraser avec confirmation, depuis la partie (💾) et depuis l'accueil", () => {
    const ui = readFileSync("src/v2/ui.ts", "utf8");
    for (const x of ["EMPLACEMENTS = 3", "function ecrireEmplacement", "function chargerEmplacement", "data-sauver", "data-charger", "v2-charger-acc", "v2-sauve", "Écraser l'emplacement"]) expect(ui, x).toContain(x);
  });
});
