// Tests d'acceptation : stabilité, élections et changements de gouvernement (demande du 2 novembre 2026).
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as PV from "../src/v2/pouvoir";

const annee = (e: M.EtatV2) => { M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); return M.anneeSuivante(e); };

describe("Stabilité et régimes de départ (estimation)", () => {
  const e = M.creerPartieV2(11, "OCC");
  it("la stabilité de 2000 est différenciée : donnée Banque mondiale (WGI) : Afghanistan et Somalie en effondrement, Suisse et Norvège très stables", () => {
    expect(PV.palier(e.pays.AFG.stabilite)).toBe(0); expect(PV.palier(e.pays.SOM.stabilite)).toBe(0);
    expect(PV.palier(e.pays.CHE.stabilite)).toBe(4); expect(PV.palier(e.pays.NOR.stabilite)).toBe(4);
    const v = Object.values(e.pays).map(p => p.stabilite); expect(Math.max(...v) - Math.min(...v)).toBeGreaterThan(70);
  });
  it("6 régimes présents en 2000, chacun cohérent : USA présidentiel, Chine parti unique, Arabie monarchie, Pakistan régime militaire, Allemagne parlementaire, Russie hybride", () => {
    expect(e.gouv!.USA.regime).toBe("presidentiel"); expect(e.gouv!.CHN.regime).toBe("parti"); expect(e.gouv!.SAU.regime).toBe("monarchie");
    expect(e.gouv!.PAK.regime).toBe("junte"); expect(e.gouv!.DEU.regime).toBe("parlementaire"); expect(e.gouv!.RUS.regime).toBe("hybride");
    expect(new Set(Object.values(e.gouv!).map(g => g.regime)).size).toBe(6);
  });
  it("calendrier réel au départ : présidentielle américaine 2004, congrès chinois 2002, France 2002 ; pas de scrutin en monarchie", () => {
    expect(e.gouv!.USA.prochaine).toBe(2004); expect(e.gouv!.CHN.prochaine).toBe(2002); expect(e.gouv!.FRA.prochaine).toBe(2002); expect(e.gouv!.SAU.prochaine).toBe(0);
  });
});

describe("Partie complète : tout évolue (40 parties IA, 2000-2050)", () => {
  const types: Record<string, number> = {}; let alt = 0, succ = 0, regimesChanges = 0, parties = 0, evPol = 0;
  for (let s = 501; s <= 540; s++) {
    const e = M.creerPartieV2(s, s % 2 ? "OCC" : "CHN"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN");
    const depart = Object.fromEntries(Object.entries(e.gouv!).map(([k, g]) => [k, g.regime]));
    while (!e.fin) { const d = annee(e); void d; evPol += 0; }
    for (const c of e.changements ?? []) types[c.type] = (types[c.type] ?? 0) + 1;
    for (const a of e.alternances ?? []) a.type === "succession" ? succ++ : alt++;
    regimesChanges += Object.entries(e.gouv!).filter(([k, g]) => g.regime !== depart[k]).length; parties++;
  }
  const parAn = (k: string) => (types[k] ?? 0) / parties / 51;
  it("coups d'État réussis : entre 1 et 3,5 par an dans le monde (réel 2000-2025 : environ 2) ; révolutions entre 0,3 et 1,5 par an", () => {
    expect(parAn("coup")).toBeGreaterThanOrEqual(1); expect(parAn("coup")).toBeLessThanOrEqual(3.5);
    expect(parAn("revolution")).toBeGreaterThanOrEqual(0.3); expect(parAn("revolution")).toBeLessThanOrEqual(1.5);
  });
  it("alternances électorales : entre 6 et 20 par an ; les régimes changent (au moins 10 pays par partie)", () => {
    expect(parAn("alternance")).toBeGreaterThanOrEqual(6); expect(parAn("alternance")).toBeLessThanOrEqual(20);
    expect(regimesChanges / parties).toBeGreaterThanOrEqual(10);
  });
  it("les deux camps changent de dirigeant au fil des 51 ans (alternances ou successions : au moins 3 par partie en moyenne)", () => {
    expect((alt + succ) / parties).toBeGreaterThanOrEqual(3);
  });
});

describe("Camp du joueur : campagne et alternance", () => {
  it("la carte de campagne décale la chance de maintien d'au plus ±0,6 en logit, et le choix est enregistré", () => {
    const e = M.creerPartieV2(12, "OCC"); while (e.annee < 2004) annee(e);
    expect(PV.anneeElectionCamp(e, "OCC")).toBe(true);
    const ps = PV.THEMES.OCC.map(t => PV.chanceMaintien(e, "OCC", t.id)), p0 = PV.chanceMaintien(e, "OCC");
    for (const p of ps) { expect(Math.abs(Math.log(p / (1 - p)) - Math.log(p0 / (1 - p0)))).toBeLessThanOrEqual(0.6001); }
    PV.choisirCampagne(e, "OCC", "economie"); expect(e.campagne!.OCC!.theme).toBe("economie");
  });
  it("une défaite donne un nouveau dirigeant au nom jamais vu, un cabinet à refaire, les alliés qui doutent et un point de grâce", () => {
    let trouve = false;
    for (let s = 600; s < 640 && !trouve; s++) {
      const e = M.creerPartieV2(s, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN");
      while (!e.fin && !trouve) {
        const avant = e.dirigeants.OCC.nom, allie = e.pays.GBR.att.OCC;
        M.jouerEvenements(e); M.distribuerMains(e); M.mainIA(e, "OCC"); M.mainIA(e, "CHN"); M.repartitionIA(e, "OCC"); M.repartitionIA(e, "CHN"); M.resoudreAnnee(e);
        const a = (e.alternances ?? []).find(x => x.camp === "OCC" && x.annee === e.annee && x.type === "alternance");
        if (a) {
          trouve = true; expect(e.dirigeants.OCC.nom).not.toBe(avant); expect(a.ancien).toBe(avant);
          expect(Object.keys(e.cabinet.OCC)).toHaveLength(0); expect(e.pays.GBR.att.OCC).toBeLessThan(allie + 0.01);
          M.anneeSuivante(e); expect(PV.alternanceJoueur(e)?.nouveau).toBe(e.dirigeants.OCC.nom); expect(PV.bonusGrace(e, "OCC")).toBe(1);
        } else { M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); M.anneeSuivante(e); }
      }
    }
    expect(trouve).toBe(true);
  });
});

describe("Influencer le gouvernement : élection ou coup d'État", () => {
  it("s'il y a un scrutin dans les 3 ans, c'est une campagne et le sondage monte avec les points ; sinon, voie du coup d'État", () => {
    const e = M.creerPartieV2(13, "OCC");
    expect(PV.voieGouvernement(e, "FRA").voie).toBe("election"); expect(PV.voieGouvernement(e, "SAU").voie).toBe("coup");
    const s0 = PV.sondage(e, "BRA", "CHN"); e.points.CHN = 6; M.engager(e, "CHN", "gouvernement", e.pays.BRA.zone, 4, "BRA");
    expect(PV.sondage(e, "BRA", "CHN")).toBeGreaterThan(s0);
  });
  it("le malus de stabilité du cabinet est plafonné à 10 sous le niveau de départ du leader", () => {
    const e = M.creerPartieV2(14, "CHN"); const b = e.stabiliteDepart!.CHN;
    e.cabinet.CHN = { interieur: { id: "x", nom: "X", domaine: "interieur", portrait: "", femme: false, bonus: { texte: "" }, malus: { texte: "", stabilite: -5 } } };
    for (let i = 0; i < 20; i++) M.appliquerStabiliteCabinet(e);
    expect(e.pays.CHN.stabilite).toBeGreaterThanOrEqual(b - 10 - 1e-9);
  });
});
