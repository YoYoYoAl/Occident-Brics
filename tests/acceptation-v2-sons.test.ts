// Bande son de la maquette v2 : chaque ambiance utilisée a tous ses morceaux, l'interface branche musique et boutons.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { MUSIQUES, pisteMusique, musiqueEre, musiqueAnnee, type Musique } from "../src/interface/sons";

const AMBIANCES_V2: Musique[] = ["menu", "ere1", "ere2", "ere3", "tension", "guerre", "victoire", "defaite"];
// morceaux intégrés au HTML (ajout du 2 novembre 2026) : menu_4, menu_5, occident, chine, rencontre
const INTEGRES = ["menu_4", "menu_5", "occident", "occident_2", "chine", "chine_2", "rencontre", "rencontre_2"];
describe("bande son v2", () => {
  it("1. tous les morceaux des ambiances v2 existent", () => {
    for (const m of [...AMBIANCES_V2, "occident", "chine", "rencontre"] as Musique[]) for (let i = 1; i <= MUSIQUES[m]; i++) {
      const p = pisteMusique(m, i), n = p.slice(9, -4);
      expect(existsSync(INTEGRES.includes(n) ? `src/v2/${p}` : `public/${p}`), p).toBe(true);
    }
  });
  it("2. 30 fichiers publiés à part (limite de 511 inchangée), 8 morceaux intégrés au HTML", () => {
    const sh = readFileSync("outils/musiques-maquette.sh", "utf8");
    for (const m of AMBIANCES_V2) expect(sh).toContain(m);
    expect(sh).toContain("menu_[23]");
    expect(AMBIANCES_V2.reduce((s, m) => s + MUSIQUES[m], 0) + 6 - INTEGRES.length).toBe(30);
  });
  it("3. thème d'ère selon l'année", () => {
    expect(musiqueEre(2000)).toBe("ere1"); expect(musiqueEre(2010)).toBe("ere2"); expect(musiqueEre(2040)).toBe("ere3");
  });
  it("3b. rotation des années de paix : ère, thème du camp, rencontre", () => {
    expect(musiqueAnnee(2001, "OCC")).toBe("occident"); expect(musiqueAnnee(2001, "CHN")).toBe("chine");
    expect(musiqueAnnee(2002, "OCC")).toBe("rencontre"); expect(musiqueAnnee(2003, "CHN")).toBe("ere1"); expect(musiqueAnnee(2000, "OCC")).toBe("ere1");
    const ui = readFileSync("src/v2/ui.ts", "utf8"); expect(ui).toContain("SON.musiqueAnnee(e.annee, e.joueur)"); expect(ui).toContain("SON.integrerMusiques");
  });
  it("4. l'interface v2 branche la musique, la guerre, les boutons et le jingle", () => {
    const ui = readFileSync("src/v2/ui.ts", "utf8");
    for (const x of ['SON.musique(ambiance())', 'SON.musique("guerre")', 'v2-son', 'SON.jouerJingle', 'SON.relancerMusique']) expect(ui).toContain(x);
  });
  it("5. les bruitages sont intégrés au HTML de la maquette", () => {
    expect(readFileSync("vite.maquette.config.ts", "utf8")).toContain('f.endsWith(".mp3")');
  });
});
