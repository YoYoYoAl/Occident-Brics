import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as RS from "../src/v2/ressources";

describe("Vue Ressources (acceptation)", () => {
  const e = M.creerPartieV2(7, null as any);
  it("profils réels 2000 : Arabie saoudite et Russie exportent l'énergie, Japon en manque", () => {
    expect(RS.role("SAU", "energie")).toBe("offre");
    expect(RS.role("RUS", "energie")).toBe("offre");
    expect(RS.role("JPN", "energie")).toBe("besoin");
  });
  it("terres rares : la Chine en a, le Japon industriel sans gisement en manque", () => {
    expect(RS.role("CHN", "terres")).toBe("offre");
    expect(["besoin", "neutre"]).toContain(RS.role("JPN", "terres"));
  });
  it("chaque bien a des fournisseurs et des demandeurs parmi les 194 pays", () => {
    for (const b of RS.BIENS) {
      const r = Object.keys(e.pays).map(i => RS.role(i, b.id));
      expect(r.filter(x => x === "offre").length, b.id).toBeGreaterThanOrEqual(b.id === "terres" ? 3 : 4); // terres rares : marché très concentré en 2000
      expect(r.filter(x => x === "besoin").length, b.id).toBeGreaterThan(3);
    }
  });
  it("lecture cohérente avec le rôle et l'alignement ; le bilan est fini et positif", () => {
    for (const iso of Object.keys(e.pays)) for (const b of RS.BIENS) {
      const l = RS.lecture(e, "OCC", iso, b.id), r = RS.role(iso, b.id);
      expect(r === "neutre" ? l === "neutre" : r === "offre" ? l.startsWith("fournisseur") : l.startsWith("demandeur")).toBe(true);
    }
    expect(RS.lecture(e, "OCC", "USA", "alimentation")).toBe("fournisseur_ami"); // le leader est toujours proche de son camp
    for (const c of ["OCC", "CHN"] as const) for (const b of RS.BIENS) { const x = RS.bilan(e, c, b.id); expect(Number.isFinite(x.offre) && x.offre >= 0 && x.besoin >= 0).toBe(true); }
  });
  it("la vue ne consomme pas le générateur aléatoire", () => {
    const a = M.creerPartieV2(9, null as any), b = M.creerPartieV2(9, null as any);
    for (const x of RS.BIENS) { RS.bilan(a, "OCC", x.id); RS.lecture(a, "CHN", "IND", x.id); }
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});
