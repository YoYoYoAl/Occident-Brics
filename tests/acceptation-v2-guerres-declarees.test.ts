// Retour du 3 novembre 2026 : « j'ai déclaré la guerre à la Chine, il ne s'est rien passé », « événement guerre en Irak, pas de guerre ».
import { describe, expect, it } from "vitest";
import * as M from "../src/v2/moteur";
import * as B from "../src/v2/bataille";
import * as CR from "../src/v2/crises";

const avant = (e: M.EtatV2, f?: () => void) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "CHN"); M.repartitionIA(e, "CHN"); f?.(); };
const anneeIA = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); return M.anneeSuivante(e); };
const suivante = (e: M.EtatV2) => { M.resoudreAnnee(e); M.cabinetIA(e, "CHN"); M.anneeSuivante(e); };

describe("Déclarer la guerre", () => {
  it("1. la guerre contre la Chine s'ouvre avant la phase de guerre et se joue la même année", () => {
    const e = M.creerPartieV2(77, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN");
    avant(e, () => { e.points.OCC = 10; M.engager(e, "OCC", "casusbelli", "ASE", 2, "CHN"); }); suivante(e);
    avant(e, () => { e.points.OCC = 10; expect(M.engager(e, "OCC", "guerre", "ASE", 5, "CHN")).toBeTruthy(); });
    M.ouvrirGuerresDeclarees(e); // ce que fait l'écran avant la phase de guerre
    const g = B.guerresDuJoueur(e);
    expect(g.length).toBe(1);
    expect(g[0].directe).toBe(true);
    expect(g[0].debut).toBe(e.annee);
    const tension = e.tension; M.ouvrirGuerresDeclarees(e); expect(e.tension).toBe(tension); // pas de double ouverture
    M.resoudreAnnee(e);
    expect(e.guerres!.filter(x => x.a === "USA" && x.b === "CHN").length).toBe(1);
    expect(e.conflits!.some(c => c.pays.includes("CHN"))).toBe(true); // première année de combats résolue cette année
  });
});

describe("Guerres des événements historiques", () => {
  it("2. l'événement Irak ouvre une guerre États-Unis contre Irak, combats l'année suivante", () => {
    const e = M.creerPartieV2(5, "OCC"); e.annee = 2003;
    const g = CR.guerreHistorique(e, "h_irak")!;
    expect(g).toBeTruthy(); expect([g.a, g.b]).toEqual(["USA", "IRQ"]); expect(g.debut).toBe(2004);
    expect(CR.guerresAnnee(e).some(c => c.pays.includes("IRQ"))).toBe(false); // pas de combats l'année de l'annonce
    e.annee = 2004;
    expect(B.guerresDuJoueur(e).some(x => x.id === g.id)).toBe(true); // jouée sur le plateau par l'Occident
  });
  it("3. pas de guerre si la cible est devenue proche de l'agresseur (tout évolue)", () => {
    const e = M.creerPartieV2(5, "OCC"); e.annee = 2003;
    e.pays.IRQ.att.OCC = 95; e.pays.IRQ.eco.OCC = 95; e.pays.IRQ.att.CHN = 0; e.pays.IRQ.eco.CHN = 0;
    expect(CR.guerreHistorique(e, "h_irak")).toBeUndefined();
  });
  it("4. dans de vraies parties, les événements de guerre ouvrent presque toujours leur guerre", () => {
    let vus = 0, ouvertes = 0;
    for (const graine of [11, 12, 13, 14, 15, 16]) {
      const e = M.creerPartieV2(graine, null as any);
      while (e.annee <= 2023 && !e.defaite) anneeIA(e);
      for (const [id, [a, b]] of Object.entries(CR.GUERRES_HISTORIQUES)) {
        if (!(e.faits ?? []).includes(id)) continue; vus++;
        if ((e.guerres ?? []).some(g => [g.a, g.b].includes(a) && [g.a, g.b].includes(b))) ouvertes++;
      }
    }
    console.log(`événements de guerre : ${vus}, guerres ouvertes : ${ouvertes}`);
    expect(vus).toBeGreaterThan(20);
    expect(ouvertes / vus).toBeGreaterThan(0.85); // les autres : la cible a rejoint le camp de l'agresseur (tout évolue)
  }, 90_000);
});
