// Tests d'acceptation des sons : chaque famille d'événements a un bruitage existant, les musiques sont présentes et créditées.
import { describe, it, expect } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import { bruitage } from "../src/interface/sons";
import { HISTORIQUES_ERE1 } from "../src/contenu/historiques";
import { FAMILLES } from "../src/contenu/generiques";

describe("Sons et musiques", () => {
  it("1. chaque famille (générique et historique) a un bruitage dont le fichier existe", () => {
    const familles = new Set([...FAMILLES.map(f => f.id), ...HISTORIQUES_ERE1.map(h => h.famille)]);
    for (const f of familles) {
      const nom = bruitage(f);
      expect(nom, f).not.toBeNull();
      expect(existsSync(`src/sons/${nom}.mp3`), `${f} → ${nom}`).toBe(true);
    }
    expect(bruitage("inconnue")).toBeNull();
  });
  it("2. six musiques présentes, chacune < 1,5 Mo, licences CC0 documentées ; jingles présents", () => {
    for (const m of ["menu", "carte", "calme", "tension", "victoire", "defaite"]) {
      const p = `public/musiques/${m}.mp3`;
      expect(existsSync(p), p).toBe(true);
      expect(statSync(p).size).toBeLessThan(1.5e6);
    }
    expect(readFileSync("public/musiques/LICENCES.md", "utf8")).toMatch(/CC0/);
    for (const j of ["jingle_victoire", "jingle_defaite"]) expect(existsSync(`src/sons/${j}.mp3`)).toBe(true);
  });
});
