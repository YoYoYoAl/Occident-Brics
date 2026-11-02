// Bande son de la maquette v2 : chaque ambiance utilisée a tous ses morceaux, l'interface branche musique et boutons.
import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { MUSIQUES, pisteMusique, musiqueEre, type Musique } from "../src/interface/sons";

const AMBIANCES_V2: Musique[] = ["menu", "ere1", "ere2", "ere3", "tension", "guerre", "victoire", "defaite"];
describe("bande son v2", () => {
  it("1. tous les morceaux des ambiances v2 existent", () => {
    for (const m of AMBIANCES_V2) for (let i = 1; i <= MUSIQUES[m]; i++) expect(existsSync(`public/${pisteMusique(m, i)}`), pisteMusique(m, i)).toBe(true);
  });
  it("2. le script de publication copie exactement ces ambiances (30 fichiers, sous la limite de 511)", () => {
    const sh = readFileSync("outils/musiques-maquette.sh", "utf8");
    for (const m of AMBIANCES_V2) expect(sh).toContain(m);
    expect(AMBIANCES_V2.reduce((s, m) => s + MUSIQUES[m], 0)).toBe(30);
  });
  it("3. thème d'ère selon l'année", () => {
    expect(musiqueEre(2000)).toBe("ere1"); expect(musiqueEre(2010)).toBe("ere2"); expect(musiqueEre(2040)).toBe("ere3");
  });
  it("4. l'interface v2 branche la musique, la guerre, les boutons et le jingle", () => {
    const ui = readFileSync("src/v2/ui.ts", "utf8");
    for (const x of ['SON.musique(ambiance())', 'SON.musique("guerre")', 'v2-son', 'SON.jouerJingle', 'SON.relancerMusique']) expect(ui).toContain(x);
  });
  it("5. les bruitages sont intégrés au HTML de la maquette", () => {
    expect(readFileSync("vite.maquette.config.ts", "utf8")).toContain('f.endsWith(".mp3")');
  });
});
