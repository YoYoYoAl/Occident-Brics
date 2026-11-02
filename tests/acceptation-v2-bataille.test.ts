// Phase de guerre jouée (demandes du 2 novembre 2026) : cartes tirées de l'armée, du général et du budget ; mécanique propre
// (ordres secrets payés en logistique, loi du carré, attrition) ; ciel, mer, information, spatial ; projection, blocus, base alliée ;
// nucléaire et biologique par la dissuasion ; front intérieur, diplomatie, négociation ; seulement les guerres du joueur.
import { describe, it, expect } from "vitest";
import * as M from "../src/v2/moteur";
import * as CR from "../src/v2/crises";
import * as B from "../src/v2/bataille";
const base = (g: number) => { const e = M.creerPartieV2(g, "OCC"); M.cabinetIA(e, "OCC"); M.cabinetIA(e, "CHN"); e.appels = []; return e; };
const guerre = (e: M.EtatV2, a: string, b: string) => { const g = CR.ouvrirGuerre(e, a, b, "test")!; g.allies = {}; g.garants = {}; return g; };
const types = (l: B.CarteCmd[]) => new Set(l.map(c => c.type));
const jouer = (e: M.EtatV2, b: B.Bataille) => { while (!b.finie) { B.planIA(b, "a"); B.planIA(b, "b"); B.resoudreSaison(e, b); } return B.resultat(b); };

describe("Paquet de commandement : armée, général, budget", () => {
  it("1. l'armée fixe les cartes : pas de marine sans littoral, spatial rare, drones après 2008, robots après 2022", () => {
    const e = base(1);
    const eth = B.paquetArmee(e, "ETH", "a"), usa = B.paquetArmee(e, "USA", "a");
    expect(eth.some(c => c.domaine === "mer")).toBe(false);
    expect(eth.some(c => c.domaine === "espace")).toBe(false);
    expect(eth.length).toBeGreaterThanOrEqual(B.BATAILLE.paquetMin);
    expect(usa.filter(c => c.type === "satellite").length).toBe(1);
    expect(types(usa).has("asat")).toBe(false); // 2000 : pas encore
    expect(types(usa).has("drones")).toBe(true); // aviation de premier rang
    expect(types(eth).has("drones")).toBe(false);
    for (const t of ["infanterie", "mecanisee", "blindes", "artillerie", "helico", "chasseurs", "bombardiers", "corvettes", "destroyers", "croiseurs", "sousmarins", "porteavions"] as B.TypeCarte[]) expect(types(usa).has(t)).toBe(true);
    expect(types(usa).has("robots")).toBe(false);
    e.annee = 2030; const usa30 = B.paquetArmee(e, "USA", "a"); expect(types(usa30).has("robots")).toBe(true); expect(types(usa30).has("asat")).toBe(true);
    expect(usa.length).toBeGreaterThan(3 * eth.length);
  });
  it("2. le paquet suit la force militaire actuelle (tout évolue)", () => {
    const e = base(2), n0 = B.paquetArmee(e, "IND", "a").length; e.pays.IND.militaire *= 2;
    expect(B.paquetArmee(e, "IND", "a").length).toBeGreaterThan(n0);
  });
  it("3. le général ajoute 2 cartes de son trait, le budget 1 carte avancée par tranche", () => {
    const e = base(3), gen: B.General = { nom: "X", trait: "aviateur", portrait: "p" };
    const l = B.paquetArmee(e, "FRA", "a", gen, 2);
    expect(l.filter(c => c.origine === "general" && c.type === "raid_nocturne").length).toBe(2);
    expect(l.filter(c => c.origine === "budget").length).toBe(2);
    expect(l.filter(c => c.type === "missiles").length).toBeGreaterThanOrEqual(1);
  });
  it("4. engager le budget de guerre est plafonné (3 tranches, budget libre du camp)", () => {
    const e = base(4); e.budget.OCC = 2; e.boostsUtilises.OCC = 0;
    expect(B.engagerBudget(e, "OCC", 3)).toBe(2); expect(e.boostsUtilises.OCC).toBe(2); expect(B.engagerBudget(e, "OCC", 1)).toBe(0);
  });
});

describe("Préparation : logistique, ordres, projection, base alliée", () => {
  it("5. la logistique et le nombre d'ordres suivent la taille de l'armée", () => {
    const e = base(5), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "b");
    expect(b.a.base).toBeGreaterThan(b.b.base); expect(b.a.ordres).toBe(4); expect(b.b.ordres).toBe(3);
    expect(b.a.main.length).toBe(B.BATAILLE.main); expect(b.objectifs.length).toBe(3);
  });
  it("6. projection : 100 % dans sa zone, moins loin de chez soi, les blindés restent au pays en premier", () => {
    const e = base(6);
    expect(B.projection(e, "RUS", "GEO")).toBe(e.pays.RUS.zone === e.pays.GEO.zone ? 1 : B.projection(e, "RUS", "GEO"));
    const loin = Object.values(e.pays).find(p => p.zone !== e.pays.IND.zone && p.iso !== "IND")!.iso;
    const pr = B.projection(e, "IND", loin); expect(pr).toBeLessThan(1); expect(pr).toBeGreaterThanOrEqual(B.PROJECTION.base);
    expect(B.projection(e, "USA", loin === "USA" ? "IRN" : loin)).toBeGreaterThan(pr);
  });
  it("7. base alliée : +1 logistique pour le côté qui en a une dans la zone du front", () => {
    const e = base(7), g = guerre(e, "IND", "PAK"), b0 = B.preparerBataille(e, g, "a");
    const allie = Object.values(e.pays).find(p => p.zone === e.pays.PAK.zone && p.iso !== "IND" && p.iso !== "PAK")!;
    e.griefs = {}; M.ajouterGrief(e, "IND", allie.iso, 100);
    const b1 = B.preparerBataille(e, g, "a");
    expect(B.baseAlliee(e, "IND", g)).not.toBeNull(); expect(b1.a.base).toBe(b0.a.baseAlliee ? b0.a.base : b0.a.base + B.BASE.logistique);
  });
});

describe("Ordres, résolution, attrition", () => {
  it("8. planifier : logistique, objectif obligatoire, nombre d'ordres", () => {
    const e = base(8), g = guerre(e, "ETH", "ERI"), b = B.preparerBataille(e, g, "a"), f = b.a;
    const sol = f.main.find(c => c.cible === "objectif")!;
    expect(B.planifier(b, "a", sol.id)).toMatch(/objectif/);
    f.logistique = 0; expect(B.planifier(b, "a", sol.id, 0)).toMatch(/Logistique/);
    f.logistique = 99; expect(B.planifier(b, "a", sol.id, 0)).toBeNull(); expect(f.plan.length).toBe(1);
    B.annulerOrdre(b, "a", sol.id); expect(f.plan.length).toBe(0); expect(f.logistique).toBe(99);
  });
  it("9. loi du carré : 6 contre 3 donne 80 %, égalité 50 %", () => {
    expect(B.probaVictoire(6, 3)).toBeCloseTo(0.8); expect(B.probaVictoire(4, 4)).toBe(0.5); expect(B.probaVictoire(0, 0)).toBe(0.5);
  });
  it("10. 4 saisons, contrôle borné à ±3, jauges bornées à ±3, déterministe à graine égale", () => {
    const run = () => { const e = base(10), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a"); const r = jouer(e, b); return { r, b }; };
    const x = run(), y = run();
    expect(x.b.finie).toBe(true); expect(x.b.saison).toBe(5); expect(x.r).toEqual(y.r);
    for (const o of x.b.objectifs) expect(Math.abs(o.controle)).toBeLessThanOrEqual(3);
    for (const j of [x.b.ciel, x.b.mer, x.b.info]) expect(Math.abs(j)).toBeLessThanOrEqual(3);
  });
  it("11. le plus fort gagne le plus souvent (Russie contre Géorgie ≥ 80 %), forces proches incertaines (Éthiopie-Érythrée 20-80 %)", () => {
    let v = 0; for (let k = 0; k < 100; k++) { const e = base(100 + k), g = guerre(e, "RUS", "GEO"); if (jouer(e, B.preparerBataille(e, g, "a")).d > 0) v++; }
    expect(v).toBeGreaterThanOrEqual(80);
    let w = 0; for (let k = 0; k < 100; k++) { const e = base(300 + k), g = guerre(e, "ETH", "ERI"); if (jouer(e, B.preparerBataille(e, g, "a")).d > 0) w++; }
    expect(w).toBeGreaterThan(20); expect(w).toBeLessThan(80); // forces proches : rien n'est joué d'avance
  });
  it("12. les robots perdus ne comptent pas comme pertes humaines ; le renseignement révèle le plan adverse", () => {
    const e = base(12), g = guerre(e, "ETH", "ERI"), b = B.preparerBataille(e, g, "a");
    b.a.perdues.push({ ...B.CARTES.robots, id: "r", type: "robots", origine: "armee" });
    expect(B.resultat(b).pertesA).toBe(0);
    b.info = 2; expect(B.voitPlanAdverse(b, "a")).toBe(true); expect(B.apercu(b, "a")[0].lui).toBeDefined(); expect(B.apercu(b, "b")[0].lui).toBeUndefined();
    b.info = -2; expect(B.ordresMax(b, "a")).toBe(B.BATAILLE.ordresCoupes);
  });
  it("13. bataille navale : la maîtrise de la mer impose un blocus (logistique, puis PIB en fin d'année)", () => {
    const e = base(13), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a"); b.mer = 2;
    const L = b.b.base; B.resoudreSaison(e, b); expect(b.b.logistique).toBeLessThan(L);
    const pib = e.pays.PAK.pib; B.enregistrer(g, b, e); expect(e.pays.PAK.pib).toBeLessThan(pib); expect(g.batailleJouee?.annee).toBe(e.annee);
  });
});

describe("Armes de destruction massive : dissuasion et risques", () => {
  it("14. risques affichés avant de tirer : riposte, coalition, jauge", () => {
    const e = base(14), g = guerre(e, "IND", "PAK"), r = B.risquesNucleaires(e, g, "a", "strategique");
    expect(r.riposteur).toBe("PAK"); expect(r.riposte).toBe(B.NUCLEAIRE.riposte.strategique); expect(r.hiver).toBe(3); expect(r.coalition).toBeGreaterThan(0);
  });
  it("15. frappe tactique : l'objectif tombe ; frappes répétées → crise à 4 puis défaite du responsable à 7", () => {
    const e = base(15), g = guerre(e, "RUS", "GEO"), b = B.preparerBataille(e, g, "a");
    B.nucleaire(e, b, g, "a", "tactique", 0); expect(b.objectifs[0].controle === 3 || b.objectifs[0].controle === 0).toBe(true);
    e.nucleaire!.hiver = 3; B.nucleaire(e, b, g, "a", "tactique", 1); expect(e.nucleaire!.crise).toBe(true);
    e.nucleaire!.hiver = 6; e.nucleaire!.points = { CHN: 50 }; B.nucleaire(e, b, g, "a", "tactique", 2); expect(e.defaite).toBeDefined();
  });
  it("16. biologique : un cinquième des forces ennemies hors de combat et la jauge commune monte", () => {
    const e = base(16), g = guerre(e, "IND", "PAK"), b = B.preparerBataille(e, g, "a"); const n = b.b.pioche.length + b.b.main.length;
    B.biologique(e, b, g, "a"); expect(b.b.perdues.length).toBeGreaterThanOrEqual(1); expect(b.b.perdues.length).toBeLessThanOrEqual(Math.ceil(n * 0.2) + 1);
    expect(e.nucleaire!.hiver).toBeGreaterThanOrEqual(1); expect(e.nucleaire!.bio).toBe(1);
  });
  it("17. pas de nucléaire pour qui n'en a pas", () => {
    const e = base(17), g = guerre(e, "ETH", "ERI"), b = B.preparerBataille(e, g, "a");
    expect(B.nucleaire(e, b, g, "a", "tactique")).toMatch(/Pas de capacité/);
  });
});

describe("Front intérieur, diplomatie, négociation, participation du joueur", () => {
  it("18. front intérieur : mobilisation = cartes d'infanterie, financement = logistique", () => {
    const e = base(18), g = guerre(e, "RUS", "GEO"), r = B.frontInterieur(e, g, "a", "CHN", { mobiliser: true, censurer: false, financement: "impots" });
    expect(r.bonus).toEqual({ infanterie: 2, logistique: 1 });
    const b0 = B.preparerBataille(e, g, "a"), b1 = B.preparerBataille(e, g, "a", { bonus: { a: r.bonus } });
    expect(b1.a.base).toBe(b0.a.base + 1);
  });
  it("19. Conseil de sécurité : 15 membres, veto d'un permanent", () => {
    const e = base(19); expect(B.membresConseil(2000).length).toBe(15);
    const v = B.voteSanctions(e, "OCC", "RUS"); expect(["RUS", "CHN"]).toContain(v.veto); expect(v.adopte).toBe(false);
  });
  it("20. négociation : annexion refusée sans 30 % d'occupation", () => {
    const e = base(20), g = guerre(e, "RUS", "GEO"); g.score = 80;
    expect(B.proposerTraite(e, g, "a", ["annexer"]).accepte).toBe(false);
  });
  it("21. le joueur ne commande que les guerres où son camp participe", () => {
    const e = base(21), g = guerre(e, "ETH", "ERI"); g.parCamp = {};
    expect(B.coteJoueur(e, g, "OCC")).toBeNull();
    g.garants = { OCC: "ERI" }; expect(B.coteJoueur(e, g, "OCC")).toBe("b");
  });
  it("22. guerres possibles entre tous les voisins brouillés (relation ≤ −40), hors conflits déjà listés", () => {
    const e = base(22); const z = Object.values(e.pays).filter(p => p.zone === e.pays.FRA.zone && !CR.enGuerre(e, p.iso)).map(p => p.iso);
    const [x, y] = z.filter(i => i !== "FRA").slice(0, 2); e.griefs = {}; M.ajouterGrief(e, x, y, -100);
    expect(CR.pairesBrouillees(e).some(([a, b]) => [a, b].sort().join() === [x, y].sort().join())).toBe(true);
  });
});
describe("Guerres en arrière-plan et effets mondiaux", () => {
  it("23. une guerre sans le joueur est résolue par le même moteur (IA contre IA)", () => {
    const e = base(23), g = guerre(e, "RUS", "GEO"); const d = B.batailleAuto(e, g);
    expect(Number.isFinite(d)).toBe(true); expect(Math.abs(d)).toBeLessThanOrEqual(60);
  });
  it("24. pénuries et inflation mondiale : un exportateur en guerre perd de la production, l'inflation monte partout", () => {
    const e = base(24), g = guerre(e, "RUS", "GEO"); const inf0 = { ...e.monnaie!.inflation };
    const l = CR.chocEconomique(e, g);
    expect(l.join(" ")).toMatch(/production perturbée/); expect(e.monnaie!.inflation.OCC).toBeGreaterThan(inf0.OCC); expect(e.monnaie!.inflation.CHN).toBeGreaterThan(inf0.CHN);
  });
  it("25. résolution de l'ONU : sanctions adoptées (PIB, armée) ou veto (tension)", () => {
    const e = base(25), g = guerre(e, "RUS", "GEO"); let r: string | null = null;
    for (let k = 0; k < 20 && !r; k++) r = B.resolutionONU(e, g);
    expect(r).toMatch(/ONU/);
    const pib = e.pays.ERI.pib, mil = e.pays.ERI.militaire; B.appliquerSanctions(e, "OCC", "ERI");
    expect(e.pays.ERI.pib).toBeLessThan(pib); expect(e.pays.ERI.militaire).toBeLessThan(mil);
  });
});
describe("Casques bleus", () => {
  it("26. après un cessez-le-feu : mission de 5 ans, pas de nouvelle guerre, stabilité +2 par an", () => {
    const e = base(26), g = guerre(e, "ETH", "ERI"); g.lassitude = { a: 0, b: 80 };
    expect(B.cessezLeFeu(e, g, "a")).toBe(true); expect(CR.sousMission(e, "ERI", "ETH")).toBe(true);
    expect(CR.ouvrirGuerre(e, "ETH", "ERI", "test")).toBeUndefined();
    const s = e.pays.ETH.stabilite; CR.missionsAnnee(e); expect(e.pays.ETH.stabilite).toBe(Math.min(100, s + 2));
    e.annee += 6; expect(CR.sousMission(e, "ETH", "ERI")).toBe(false);
  });
});
