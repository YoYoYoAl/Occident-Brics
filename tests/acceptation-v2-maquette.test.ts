// Tests d'acceptation du moteur de la maquette v2 (une année).
import { ZONES, ZONE_DE, ROUTES } from "../src/v2/zones";
import donnees from "../src/data/pays2000.json";
import * as M from "../src/v2/moteur";

const ISO = (donnees as any).pays.map((p: any) => p.iso3) as string[];
const portraits = ["OCC", "CHN"].flatMap(c => M.DOMAINES.flatMap(d => Array.from({ length: 20 }, (_, i) => ({ nom: `conseiller2_${c.toLowerCase()}_${d.id}_${i}`, femme: i % 3 === 0 }))));
M.enregistrerPortraits(portraits);
const nouvelle = (g = 7) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return e; };

describe("Zones et routes", () => {
  test("les 194 pays sont chacun dans exactement une des 12 zones", () => {
    expect(ZONES).toHaveLength(12);
    const tous = ZONES.flatMap(z => z.pays);
    expect(tous).toHaveLength(194);
    expect(new Set(tous).size).toBe(194);
    expect(ISO.every(i => ZONE_DE[i])).toBe(true);
  });
  test("36 routes (maritimes, terrestres, aériennes), chacune tenue par des pays existants, identifiants uniques", () => {
    expect(ROUTES).toHaveLength(36);
    expect(new Set(ROUTES.map(r => r.id)).size).toBe(36);
    expect(ROUTES.every(r => r.trace.length >= 3 && r.trace.every(([x, y]) => Math.abs(x) <= 180 && Math.abs(y) <= 90))).toBe(true);
    expect(ROUTES.every(r => r.pays.length > 0 && r.pays.every(i => ZONE_DE[i]))).toBe(true);
  });
});

describe("Relations de départ (estimation)", () => {
  const e = nouvelle();
  test("les poids des pays totalisent 100", () => {
    expect(Object.values(e.pays).reduce((s, p) => s + p.poids, 0)).toBeCloseTo(100, 6);
    expect(e.pays.USA.poids).toBeGreaterThan(e.pays.CHN.poids);
  });
  test("21 degrés et 7 niveaux de 3 degrés", () => {
    expect(M.niveau(0)).toBe(3); expect(M.niveau(100)).toBe(6); expect(M.niveau(-100)).toBe(0);
    expect(M.niveau(M.PAS_DEGRE * 2)).toBe(4); expect(M.niveau(M.PAS_DEGRE * 1)).toBe(3);
  });
  test("plausible en 2000 : alliés en alliance, sanctionnés hostiles, méfiance entre leaders", () => {
    expect(M.ATTITUDES[M.niveau(e.pays.GBR.att.OCC)]).toBe("Alliance");
    expect(M.ATTITUDES[M.niveau(e.pays.PRK.att.CHN)]).toBe("Alliance");
    expect(M.niveau(e.pays.IRN.att.OCC)).toBeLessThanOrEqual(1);
    expect(M.ECONOMIES[M.niveau(e.pays.CUB.eco.OCC)]).toBe("Sanctions");
    expect(M.ATTITUDES[M.niveau(e.pays.CHN.att.OCC)]).toBe("Méfiance");
    expect(M.ATTITUDES[M.niveau(e.pays.USA.att.CHN)]).toBe("Méfiance");
  });
});

describe("Conseillers et dirigeants", () => {
  const e = nouvelle(11);
  test("3 candidats par domaine, noms et portraits jamais répétés", () => {
    const tous = (["OCC", "CHN"] as M.Camp[]).flatMap(c => M.DOMAINES.flatMap(d => e.candidats[c][d.id]));
    expect(tous).toHaveLength(30);
    expect(new Set(tous.map(c => c.nom)).size).toBe(30);
    expect(new Set(tous.map(c => c.portrait)).size).toBe(30);
    expect(tous.every(c => c.portrait.includes(`_${c.domaine}_`))).toBe(true);
  });
  test("bonus plafonnés : ±15 % par caractéristique, −1 à +2 points", () => {
    for (const k of ["dev", "secret", "mil", "influence", "partenariat"] as const) { const m = M.multEffet(e, "OCC", k); expect(m).toBeGreaterThanOrEqual(0.85); expect(m).toBeLessThanOrEqual(1.15); }
    expect(M.bonusPoints(e, "OCC")).toBeGreaterThanOrEqual(-1); expect(M.bonusPoints(e, "OCC")).toBeLessThanOrEqual(2);
  });
});

describe("Cartes et points", () => {
  test("main de 6 : 2 propres, 2 adverses, 2 neutres ; valeurs 1-2, 3-4, 2-3", () => {
    const e = nouvelle(3); M.distribuerMains(e);
    const m = e.main.OCC;
    expect(m.map(c => c.source).sort()).toEqual(["adverse", "adverse", "neutre", "neutre", "propre", "propre"]);
    for (const c of m) { const [a, b] = { propre: [1, 2], neutre: [2, 3], adverse: [3, 4] }[c.source]; expect(c.points).toBeGreaterThanOrEqual(a); expect(c.points).toBeLessThanOrEqual(b); }
    expect(m.find(c => c.source === "propre")!.carte.camp).toBe("OCC");
    expect(m.find(c => c.source === "adverse")!.carte.camp).toBe("CHN");
  });
  test("il faut écarter exactement 2 cartes ; les points = somme des 4 jouées + bonus", () => {
    const e = nouvelle(3); M.distribuerMains(e);
    expect(() => M.jouerMain(e, "OCC", [0])).toThrow();
    M.jouerMain(e, "OCC", [0, 1]);
    const somme = e.main.OCC.filter(c => !c.ecartee).reduce((s, c) => s + c.points, 0);
    expect(e.points.OCC).toBe(somme + M.bonusPoints(e, "OCC"));
    expect(e.points.OCC).toBeGreaterThanOrEqual(6); expect(e.points.OCC).toBeLessThanOrEqual(16);
  });
});

describe("Opérations et résolution", () => {
  const prete = () => { const e = nouvelle(5); M.jouerEvenements(e); M.distribuerMains(e); M.jouerMain(e, "OCC", [2, 3]); M.mainIA(e, "CHN"); return e; };
  test("événements de l'année 2000 : les 12 événements historiques, dans l'ordre des trimestres", () => {
    const e = nouvelle(); M.jouerEvenements(e);
    const hist = e.evenements.filter(x => !x.id.startsWith("chantage") && x.id !== "decouverte"); // + chantages tirés par la partie
    expect(hist).toHaveLength(M.HISTORIQUES_V2.filter(h => h.annee === 2000).length); expect(hist).toHaveLength(12);
    expect(e.evenements.map(x => x.trimestre)).toEqual([...e.evenements.map(x => x.trimestre)].sort());
  });
  test("on ne peut pas dépenser plus que ses points ; blocages expliqués", () => {
    const e = prete();
    expect(M.raisonBlocage(e, "OCC", "infiltrer", "MOA")).toMatch(/pays/);
    expect(M.raisonBlocage(e, "OCC", "guerre", "MOA", "IRN")).toMatch(/casus belli/);
    expect(M.raisonBlocage(e, "OCC", "soutien", "MOA", "ISR")).toMatch(/conflit/);
    M.engager(e, "OCC", "influence", "ASS", e.points.OCC);
    expect(M.pointsLibres(e, "OCC")).toBe(0);
    expect(M.raisonBlocage(e, "OCC", "influence", "ASS")).toMatch(/points/);
  });
  test("le boost coûte du budget, plafonné à 3 unités par opération", () => {
    const e = prete(); const b = e.budget.OCC;
    const o = M.engager(e, "OCC", "influence", "ASS", 2, undefined, 9);
    expect(o.boost).toBe(Math.min(3, b));
    M.retirer(e, o.id); expect(e.boostsUtilises.OCC).toBe(0);
  });
  test("l'influence fait monter l'attitude de la zone, avec 50 % de l'effet la 1re année", () => {
    const e = prete(); const avant = e.pays.IND.att.OCC;
    M.engager(e, "OCC", "influence", "ASS", 4);
    M.resoudreAnnee(e);
    const gain = e.pays.IND.att.OCC - avant;
    expect(gain).toBeGreaterThan(2); expect(gain).toBeLessThan(25);
  });
  test("risque d'être démasqué toujours entre 5 et 60 %", () => {
    const e = prete();
    for (const iso of ["IRN", "SAU", "TUR", "ISR"]) { const o = M.engager(e, "OCC", "saboter", "MOA", 1, iso); const r = M.risqueDemasque(e, o); expect(r).toBeGreaterThanOrEqual(5); expect(r).toBeLessThanOrEqual(60); }
  });
  test("l'IA répartit tous ses points et une opération secrète révèle les points adverses de la zone", () => {
    const e = prete(); M.repartitionIA(e, "CHN");
    expect(M.pointsLibres(e, "CHN")).toBe(0);
    const zoneIA = e.ops.find(o => o.camp === "CHN")!.zone;
    const pays = ZONES.find(z => z.id === zoneIA)!.pays.find(i => i !== "USA" && i !== "CHN")!;
    M.engager(e, "OCC", "infiltrer", zoneIA, 1, pays);
    M.resoudreAnnee(e);
    expect(e.ops.filter(o => o.camp === "CHN" && o.zone === zoneIA).every(o => o.revelee)).toBe(true);
  });
  test("traque : jamais plus de la moitié des points adverses de la zone, 2 au plus par équipe", () => {
    const e = prete(); M.repartitionIA(e, "CHN");
    const z = e.ops.filter(o => o.camp === "CHN").sort((a, b) => b.points - a.points)[0].zone;
    const o = M.engager(e, "OCC", "eliminer", z, Math.min(6, M.pointsLibres(e, "OCC")), ZONES.find(x => x.id === z)!.pays[0]);
    const t = M.preparerTraque(e, o);
    const avant = M.opsActives(e).filter(x => x.camp === "CHN" && x.zone === z).reduce((s, x) => s + x.points, 0);
    const r = M.resoudreTraque(e, t, Object.keys(t.caches).concat(ZONES.find(x => x.id === z)!.pays));
    expect(r.elimines).toBeLessThanOrEqual(Math.floor(avant / 2));
    expect(r.elimines).toBeLessThanOrEqual(2 * t.equipes);
    const apres = M.opsActives(e).filter(x => x.camp === "CHN" && x.zone === z).reduce((s, x) => s + x.points, 0);
    expect(avant - apres).toBe(r.elimines);
  });
  test("même graine, mêmes décisions : même résultat (déterminisme)", () => {
    const jouer = () => { const e = prete(); M.repartitionIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.resoudreAnnee(e); return JSON.stringify(M.decompte(e)); };
    expect(jouer()).toBe(jouer());
  });
});

describe("Décompte", () => {
  test("projection : chaque camp compte au moins son leader, jamais plus de 100", () => {
    const e = nouvelle(); const d = M.decompte(e);
    expect(d.OCC).toBeGreaterThan(e.pays.USA.poids - 1e-9); expect(d.CHN).toBeGreaterThan(e.pays.CHN.poids - 1e-9);
    expect(d.OCC).toBeLessThanOrEqual(100); expect(d.CHN).toBeLessThanOrEqual(100);
    expect(d.zones).toHaveLength(12);
  });
});

describe("Portraits des dirigeants (lot ob_11)", () => {
  it("chaque dirigeant reçoit un portrait de son camp et de son genre, jamais le même deux fois", async () => {
    const chefs = (await import("../src/v2/chefs.json")).default as Record<string, boolean>;
    const { femme } = await import("../src/moteur/pouvoir");
    M.enregistrerChefs(Object.entries(chefs).map(([nom, f]) => ({ nom, femme: f })));
    for (let g = 1; g <= 40; g++) {
      const e = M.creerPartieV2(g, "OCC");
      const o = e.dirigeants.OCC.illustre!, c = e.dirigeants.CHN.illustre!;
      expect(o.startsWith("chef_occ_") && c.startsWith("chef_chn_")).toBe(true);
      expect(chefs[o]).toBe(femme("OCC", e.dirigeants.OCC.nom));
      expect(chefs[c]).toBe(femme("CHN", e.dirigeants.CHN.nom));
      expect(new Set(e.imagesPrises).size).toBe(e.imagesPrises.length);
    }
  });
  it("les images retenues existent et le choix ne consomme pas l'aléa", async () => {
    const { existsSync } = await import("node:fs");
    const chefs = (await import("../src/v2/chefs.json")).default as Record<string, boolean>;
    for (const n of Object.keys(chefs)) expect(existsSync(`src/v2/images/${n}.webp`), n).toBe(true);
    const a = M.creerPartieV2(3, "OCC"), b = M.creerPartieV2(3, "OCC");
    expect(a.alea).toBe(b.alea); expect(a.dirigeants.OCC.illustre).toBe(b.dirigeants.OCC.illustre);
  });
});

describe("Décompte en progression (décision du 2026-11-02)", () => {
  it("la part d'un pays est continue et passe par les repères 40 / 70 / 100 %", () => {
    expect(M.partContinue(0)).toBe(0); expect(M.partContinue(-50)).toBe(0);
    expect(M.partContinue(-100 + 12 * M.PAS_DEGRE)).toBeCloseTo(0.4); expect(M.partContinue(-100 + 15 * M.PAS_DEGRE)).toBeCloseTo(0.7);
    expect(M.partContinue(-100 + 18 * M.PAS_DEGRE)).toBeCloseTo(1); expect(M.partContinue(100)).toBe(1);
    for (let x = 0; x < 100; x += 0.5) expect(M.partContinue(x + 0.5)).toBeGreaterThanOrEqual(M.partContinue(x));
  });
  it("au départ la jauge est à 0 ; après une année, elle bouge et le komi vaut komi/35", () => {
    const e = nouvelle(5), g0 = M.progression(e);
    expect(g0.OCC).toBe(0); expect(g0.CHN).toBe(0); expect(g0.jauge).toBe(0);
    M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e);
    const g = M.progression(e);
    expect(g.komi).toBeCloseTo(M.JAUGE.komi / M.JAUGE.annees);
    expect(Math.abs(g.OCC) + Math.abs(g.CHN)).toBeGreaterThan(0.1);
    expect(g.jauge).toBeCloseTo(g.OCC - g.CHN + g.komi);
  });
  it("IA contre IA sur la partie complète 2000-2050 (40 parties) : chaque camp gagne entre 25 et 65 %, nul au plus 25 %", () => {
    const r = { OCC: 0, CHN: 0, nul: 0 };
    for (let s = 301; s <= 340; s++) {
      const e = nouvelle(s);
      while (!e.fin) { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.anneeSuivante(e); }
      r[M.progression(e).tete ?? "nul"]++;
    }
    expect(r.OCC / 40).toBeGreaterThanOrEqual(0.25); expect(r.OCC / 40).toBeLessThanOrEqual(0.65);
    expect(r.CHN / 40).toBeGreaterThanOrEqual(0.25); expect(r.CHN / 40).toBeLessThanOrEqual(0.65);
    expect(r.nul / 40).toBeLessThanOrEqual(0.25);
    console.log("IA contre IA 2000-2050 :", JSON.stringify(r));
  }, 240_000);
});

describe("Enchaînement des années 2000-2050", () => {
  const annee = (e: ReturnType<typeof nouvelle>) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); return M.anneeSuivante(e); };
  it("51 années jouées : 11 décomptes (2004 … 2049 et final 2050), fin de partie, aucune valeur non finie", () => {
    const e = nouvelle(11); const d: number[] = [];
    while (!e.fin) { const x = annee(e); if (x) d.push(x.annee); }
    expect(d).toEqual([2004, 2009, 2014, 2019, 2024, 2029, 2034, 2039, 2044, 2049, 2050]);
    expect(e.decomptes![e.decomptes!.length - 1].final).toBe(true); expect(e.annee).toBe(2050); expect(e.resolues).toBe(51);
    for (const p of Object.values(e.pays)) for (const v of [p.att.OCC, p.att.CHN, p.eco.OCC, p.eco.CHN, p.pib, p.stabilite]) expect(Number.isFinite(v)).toBe(true);
  }, 60_000);
  it("budget : versé chaque année, report plafonné à 2 ans de revenu ; points et mains remis à zéro", () => {
    const e = nouvelle(12); annee(e);
    for (const c of ["OCC", "CHN"] as const) { expect(e.budget[c]).toBeLessThanOrEqual(2 * M.REVENU[c]); expect(e.budget[c]).toBeGreaterThanOrEqual(M.REVENU[c]); expect(e.points[c]).toBe(0); expect(e.main[c]).toHaveLength(0); expect(e.boostsUtilises[c]).toBe(0); }
  });
  it("une opération agit 3 années puis disparaît", () => {
    const e = nouvelle(13); annee(e);
    const ids = e.ops.filter(o => o.annee === 2000).map(o => o.id); expect(ids.length).toBeGreaterThan(0);
    annee(e); expect(e.ops.some(o => ids.includes(o.id))).toBe(true);
    annee(e); expect(e.ops.some(o => ids.includes(o.id))).toBe(false);
  });
  it("chaque année connue a ses événements historiques (2000-2026)", () => {
    for (let a = 2000; a <= 2026; a++) expect(M.HISTORIQUES_V2.some(h => h.annee === a), String(a)).toBe(true);
  });
});

describe("Carte : pas de mode redondant", () => {
  it("un seul mode Attitude (les relations d'un pays sont dedans)", async () => {
    const src = (await import("node:fs")).readFileSync("src/v2/ui.ts", "utf8");
    expect(src).not.toMatch(/id: "rel"/);
    expect(src).toMatch(/mode === "att" && etape !== 3\) \{ paysRelation/);
  });
});
