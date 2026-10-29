// Acceptation des duels (refonte du 28/10/2026) : chaque duel se joue jusqu'au bout en peu de coups,
// rend un résultat entre 0 et 1, propose toujours un coup tant qu'il n'est pas fini, et l'avantage compte.
import { describe, it, expect } from "vitest";
import { REGLES } from "../src/duels/index";
import { LISTE_DUELS } from "../src/duels/catalogue";
import { suivant } from "../src/moteur/alea";

function partie(id: string, graine: number, avantage: number, max = 400) {
  const d = REGLES[id as keyof typeof REGLES]!; let s = d.creer(graine, avantage, { noms: ["Kenya", "Éthiopie"] }), a = graine * 7 + 1, n = 0;
  while (!s.fini && n < max) {
    const cs = d.coups(s); expect(cs.length, `${id} : aucun coup proposé`).toBeGreaterThan(0);
    const v = d.vue(s); expect(typeof v.statut).toBe("string");
    let c = cs[0];
    const r = suivant(a); a = r.etat; const r2 = suivant(a); a = r2.etat;
    c = d.aide && r2.valeur < 0.75 ? d.aide(s) : cs[Math.floor(r.valeur * cs.length)]; // joueur de test : bon coup 3 fois sur 4 quand le duel sait en proposer
    s = d.jouer(s, c); n++;
  }
  return { s, n, r: d.resultat(s) };
}
describe("Duels", () => {
  for (const id of Object.keys(REGLES)) {
    it(`${id} : partie complète, résultat entre 0 et 1, l'avantage aide`, () => {
      let haut = 0, bas = 0;
      for (let g = 1; g <= 24; g++) {
        const p = partie(id, g, 1), q = partie(id, g, -1);
        expect(p.s.fini && q.s.fini, `${id} : pas fini`).toBe(true);
        expect(p.r).toBeGreaterThanOrEqual(0); expect(p.r).toBeLessThanOrEqual(1);
        expect(p.s.tour, `${id} : trop long`).toBeLessThanOrEqual(30);
        haut += p.r; bas += q.r;
      }
      expect(haut / 24, `${id} : avantage +1 ${(haut / 24).toFixed(2)} contre −1 ${(bas / 24).toFixed(2)}`).toBeGreaterThan(bas / 24);
      expect(() => REGLES[id as keyof typeof REGLES]!.jouer(partie(id, 3, 0).s, "coup-impossible")).toThrow();
    });
  }
  it("les 22 duels du catalogue ont leurs règles", () => {
    expect(LISTE_DUELS.filter(d => !REGLES[d])).toEqual([]);
  });
});
