// Tests d'acceptation de la v31 (30/10/2026) : rester au pouvoir (maquette 7) et conseillers jamais réutilisés.
import { describe, it, expect } from "vitest";
import { creerPartie, budgetTrimestre, chargerPartie, serialiserPartie, type EtatPartie } from "../src/moteur/partie";
import { succession } from "../src/moteur/dirigeants";
import { remplacerChef, chefDe, LISTE_CONSEILS } from "../src/moteur/plans";
import {
  conseillerDe, renouvelerConseillers, choisirConseiller, choisirThemes, maintienUSA, effetTheme, miMandat, CONGRES, nommer, anticorruption, choisirLigne,
  congresChine, comiteDe, peutAbolirLimite, abolirLimite, COMITE, RENOUVELLEMENT,
} from "../src/moteur/pouvoir";
import { pouvoirHtml } from "../src/interface/pouvoir-ui";

const SANS_ALEA = { generiques: false, ia: false };
const noms = (e: EtatPartie, camp: "OCC" | "CHN") => LISTE_CONSEILS.map(cs => conseillerDe(e, camp, cs)!.nom);
const tous = (e: EtatPartie) => [e.dirigeants!.OCC.nom, e.dirigeants!.CHN.nom, ...noms(e, "OCC"), ...noms(e, "CHN")];
const auRound = (e: EtatPartie, r: number) => { e.round = r; return e; };

describe("v31 : pouvoir et conseillers", () => {
  it("1. jamais deux fois le même nom ni le même portrait, même après 12 successions par bloc", () => {
    const e = creerPartie(41, "OCC", SANS_ALEA), vus = new Set<string>(tous(e)), portraits = new Set<number>();
    expect(vus.size).toBe(14);
    for (let k = 0; k < 12; k++) for (const camp of ["OCC", "CHN"] as const) {
      succession(e, camp, "test", k % 2 === 0);
      for (const n of [e.dirigeants![camp].nom, ...noms(e, camp)]) vus.add(n);
      for (const cs of LISTE_CONSEILS) portraits.add(conseillerDe(e, camp, cs)!.portrait);
    }
    expect(new Set(e.nomsPris).size).toBe(e.nomsPris!.length); // chaque nom tiré une seule fois
    expect(e.portraitsPris).toBeGreaterThanOrEqual(portraits.size);
    for (const n of vus) expect(e.nomsPris).toContain(n.replace(/^Gén\. /, ""));
  });

  it("2. renouvellement : alternance 0 ou 1 reste, successeur 3 ou 4 ; 3 candidats par siège libre pour le joueur", () => {
    for (let g = 0; g < 6; g++) {
      const e = creerPartie(50 + g, "OCC", SANS_ALEA), avant = noms(e, "OCC");
      renouvelerConseillers(e, "OCC", true);
      const restent = noms(e, "OCC").filter(n => avant.includes(n)).length;
      expect(restent).toBeGreaterThanOrEqual(RENOUVELLEMENT.alternance[0]); expect(restent).toBeLessThanOrEqual(RENOUVELLEMENT.alternance[1]);
      expect(e.pouvoir!.recrutement).toHaveLength(6 - restent);
      for (const r of e.pouvoir!.recrutement!) expect(r.candidats).toHaveLength(3);
      const f = creerPartie(60 + g, "OCC", SANS_ALEA), av = noms(f, "OCC"); renouvelerConseillers(f, "OCC", false);
      const r2 = noms(f, "OCC").filter(n => av.includes(n)).length;
      expect(r2).toBeGreaterThanOrEqual(3); expect(r2).toBeLessThanOrEqual(4);
    }
    const e = creerPartie(70, "OCC", SANS_ALEA); renouvelerConseillers(e, "OCC", true);
    const r = e.pouvoir!.recrutement![0], x = choisirConseiller(e, "OCC", r.conseil, 2);
    expect(conseillerDe(x, "OCC", r.conseil)!.nom).toBe(r.candidats[2].nom);
    expect(chefDe(x, "OCC", r.conseil)).toBe(r.candidats[2].trait);
    expect(x.pouvoir!.recrutement!.some(y => y.conseil === r.conseil)).toBe(false);
  });

  it("3. remplacer un chef de conseil nomme une personne nouvelle", () => {
    const e = creerPartie(42, "OCC", SANS_ALEA), avant = conseillerDe(e, "OCC", "economie")!;
    const x = remplacerChef(e, "OCC", "economie"), apres = conseillerDe(x, "OCC", "economie")!;
    expect(apres.nom).not.toBe(avant.nom); expect(apres.portrait).not.toBe(avant.portrait);
    expect(chefDe(x, "OCC", "economie")).toBe(apres.trait); expect(apres.trait).not.toBe(avant.trait);
  });

  it("4. présidentielle : 2 thèmes aux 2e et 3e trimestres, effet en logit borné, rien pour le bloc Chine", () => {
    const e = creerPartie(43, "OCC", SANS_ALEA);
    expect(() => choisirThemes(e, ["economie", "rang"])).toThrow(/2e et 3e trimestres/);
    const x = choisirThemes(auRound(structuredClone(e), 1), ["economie", "rang"]); // 2000 T2
    expect(() => choisirThemes(auRound(structuredClone(e), 1), ["economie", "economie"])).toThrow(/différents/);
    const p0 = 0.5, z = effetTheme(x, "economie") + effetTheme(x, "rang");
    expect(Math.abs(effetTheme(x, "securite"))).toBeLessThanOrEqual(0.6);
    expect(maintienUSA(x, p0)).toBeCloseTo(1 / (1 + Math.exp(-z)), 6);
    const c = creerPartie(43, "CHN", SANS_ALEA);
    expect(() => choisirThemes(auRound(c, 1), ["economie", "rang"])).toThrow(/bloc USA/);
    expect(maintienUSA(c, 0.3)).toBe(0.3);
  });

  it("5. mi-mandat : le Congrès suit la popularité ; budget +10 % ou −10 %, seulement pour le joueur du bloc USA", () => {
    const e = creerPartie(44, "OCC", SANS_ALEA), b0 = budgetTrimestre(e, "OCC");
    e.dirigeants!.OCC.popularite = 80; miMandat(e); expect(e.pouvoir!.congres).toBe("favorable");
    expect(Math.abs(budgetTrimestre(e, "OCC") - b0 * (1 + CONGRES.budget))).toBeLessThanOrEqual(0.1); // budget arrondi au dixième
    e.dirigeants!.OCC.popularite = 20; miMandat(e); expect(e.pouvoir!.congres).toBe("hostile");
    expect(Math.abs(budgetTrimestre(e, "OCC") - b0 * (1 - CONGRES.budget))).toBeLessThanOrEqual(0.1);
    const c = creerPartie(44, "CHN", SANS_ALEA); miMandat(c); expect(c.pouvoir?.congres).toBeUndefined();
  });

  it("6. Comité permanent : nominations, anticorruption, plénum annuel, Congrès, limite des mandats", () => {
    let e = creerPartie(45, "CHN", SANS_ALEA); e.camps.CHN.cp = 60;
    expect(comiteDe(e)).toEqual({ loyaux: 4, securitaires: 2, reformateurs: 1 });
    e = nommer(e); expect(comiteDe(e).loyaux).toBe(5); expect(e.camps.CHN.cp).toBe(60 - COMITE.nomination);
    const st = e.pays.CHN.stabilite; e = anticorruption(e); expect(comiteDe(e).loyaux).toBe(6); expect(e.pays.CHN.stabilite).toBe(Math.max(0, st - 2));
    e = choisirLigne(e, "croissance"); expect(() => choisirLigne(e, "securite")).toThrow(/déjà fixé/);
    const fort = structuredClone(e); fort.camps.CHN.cp = 90; fort.pays.CHN.stabilite = 80; expect(congresChine(fort)).toBe(true);
    const faible = structuredClone(e); comiteDe(faible).loyaux = 2; faible.camps.CHN.cp = 5; faible.pays.CHN.stabilite = 10; expect(congresChine(faible)).toBe(false);
    expect(comiteDe(faible).loyaux + comiteDe(faible).securitaires + comiteDe(faible).reformateurs).toBe(7);
    expect(peutAbolirLimite(e)).toMatch(/après 2017/);
    const tard = auRound(structuredClone(e), 4 * 18); tard.camps.CHN.cp = 40;
    expect(abolirLimite(tard).pouvoir!.limiteAbolie).toBe(true);
    expect(() => nommer(creerPartie(45, "OCC", SANS_ALEA))).toThrow(/bloc Chine/);
  });

  it("7. sauvegarde : conseillers, noms et pouvoir survivent ; une ancienne sauvegarde reçoit des conseillers nommés", () => {
    const e = creerPartie(46, "OCC", SANS_ALEA), x = chargerPartie(serialiserPartie(e));
    expect(noms(x, "OCC")).toEqual(noms(e, "OCC"));
    const ancien = JSON.parse(serialiserPartie(e)); delete ancien.conseillers; delete ancien.nomsPris;
    const y = chargerPartie(JSON.stringify(ancien));
    for (const cs of LISTE_CONSEILS) expect(conseillerDe(y, "OCC", cs)!.trait).toBe(chefDe(e, "OCC", cs));
  });

  it("8. écran du pouvoir : 5 thèmes et Congrès côté USA, 7 sièges et 3 leviers côté Chine, scrutins étrangers", () => {
    const u = pouvoirHtml(auRound(creerPartie(47, "OCC", SANS_ALEA), 1), "OCC");
    expect(u.match(/data-theme=/g)).toHaveLength(5); expect(u).toMatch(/Soutenir|Aucun scrutin/); expect(u).not.toMatch(/pv-siege/);
    const c = pouvoirHtml(creerPartie(47, "CHN", SANS_ALEA), "CHN");
    expect(c.match(/class="pv-siege /g)).toHaveLength(7);
    expect(c).toMatch(/id="pvNommer"/); expect(c).toMatch(/id="pvPurge"/); expect(c).toMatch(/id="pvAbolir"[^>]*disabled/);
    expect(c).not.toMatch(/data-theme=/);
  });
});
