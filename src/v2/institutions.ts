// Institutions internationales (demande du 2 novembre 2026) : ONU (Assemblée générale), FMI, Banque mondiale, OMC, OMS, CPI,
// Nouvelle banque de développement des BRICS (NDB, Shanghai, 2015), Banque asiatique d'investissement (AIIB, Pékin, 2016),
// Organisation de coopération de Shanghai (OCS, 2001). Le Conseil de sécurité est dans bataille.ts.
// Membres de départ et adhésions : dates réelles (listes officielles des membres, reprises de mémoire : à vérifier). Ensuite, le jeu
// décide : un pays adhère ou sort selon son alignement, son régime et sa stabilité. Le CONTRÔLE de chaque institution est la part
// des voix (1 pays = 1 voix, ou quote-part ≈ PIB) pondérée par l'alignement de chaque membre : il évolue avec la partie.
// Rôles : peu de liens, d'ampleur modérée (règle « pas de sur-interaction ») ; coefficients : estimation.
import type { EtatV2, Camp, EvenementAnnee, PaysV2 } from "./moteur";
import * as M from "./moteur";
import * as CR from "./crises";

export type IdInst = "ONU" | "FMI" | "BM" | "OMC" | "OMS" | "CPI" | "NDB" | "AIIB" | "OCS";
export interface Institution { id: IdInst; nom: string; creation: number; voix: "pays" | "pib" | "commerce" | "fondateurs"; role: string }
export const INSTITUTIONS: Institution[] = [
  { id: "ONU", nom: "ONU (Assemblée générale)", creation: 1945, voix: "pays", role: "Une résolution condamne chaque guerre ouverte par un leader : l'attitude envers son camp baisse un peu partout." },
  { id: "FMI", nom: "Fonds monétaire international", creation: 1945, voix: "pib", role: "Plans de sauvetage des pays en crise (croissance, stabilité) ; le pays se rapproche du camp qui contrôle le Fonds." },
  { id: "BM", nom: "Banque mondiale", creation: 1945, voix: "pib", role: "Finance les infrastructures des pays pauvres membres ; liens économiques avec le camp qui la contrôle." },
  { id: "OMC", nom: "Organisation mondiale du commerce", creation: 1995, voix: "commerce", role: "Partenariats plus efficaces entre membres ; une adhésion donne cinq ans de croissance en plus." },
  { id: "OMS", nom: "Organisation mondiale de la santé", creation: 1948, voix: "pays", role: "Programmes de santé dans les pays membres où la santé est faible." },
  { id: "CPI", nom: "Cour pénale internationale", creation: 2002, voix: "pays", role: "Mandat d'arrêt quand une guerre touche un État membre : l'agresseur et son camp perdent de l'estime chez les membres." },
  { id: "NDB", nom: "Nouvelle banque de développement (BRICS)", creation: 2015, voix: "fondateurs", role: "Alternative au FMI : sauvetages pour les pays proches des BRICS." },
  { id: "AIIB", nom: "Banque asiatique d'investissement", creation: 2016, voix: "pib", role: "Finance les infrastructures de ses membres pauvres ; liens économiques avec la Chine." },
  { id: "OCS", nom: "Organisation de coopération de Shanghai", creation: 2001, voix: "pays", role: "Coopération de sécurité : un peu de stabilité pour les membres fragiles, attitude envers la Chine." },
];

// ---------- Membres réels ----------
const ONU_ADHESION: Record<string, number> = { CHE: 2002, TLS: 2002, MNE: 2006, SSD: 2011 }; // Taïwan : jamais
const FMI_HORS = ["CUB", "PRK", "LIE", "MCO", "TWN"]; // jamais membres (jusqu'en 2026)
const FMI_ADHESION: Record<string, number> = { TLS: 2002, MNE: 2007, TUV: 2010, SSD: 2012, NRU: 2016, AND: 2020 };
const OMC_ADHESION: Record<string, number> = { LTU: 2001, MDA: 2001, CHN: 2001, TWN: 2002, ARM: 2003, MKD: 2003, NPL: 2004, KHM: 2004, SAU: 2005, VNM: 2007, TON: 2007,
  UKR: 2008, CPV: 2008, MNE: 2012, WSM: 2012, RUS: 2012, VUT: 2012, LAO: 2013, TJK: 2013, YEM: 2014, SYC: 2015, KAZ: 2015, LBR: 2016, AFG: 2016, COM: 2024, TLS: 2024 };
const OMC_HORS = ["IRN", "IRQ", "DZA", "ETH", "AZE", "BLR", "UZB", "TKM", "PRK", "SYR", "LBN", "LBY", "SDN", "SSD", "SOM", "ERI", "BIH", "SRB", "AND", "BTN", "BHS", "GNQ", "STP", "MCO", "SMR",
  "KIR", "MHL", "FSM", "NRU", "PLW", "TUV"]; // observateurs ou hors OMC
const CPI_HORS = ["USA", "CHN", "RUS", "IND", "IDN", "PAK", "TUR", "SAU", "IRN", "ISR", "EGY", "ETH", "VNM", "THA", "MMR", "IRQ", "SYR", "PRK", "CUB", "MYS", "KAZ", "UZB", "TKM", "KGZ",
  "TJK", "AZE", "BLR", "DZA", "MAR", "LBY", "SDN", "SSD", "SOM", "ERI", "YEM", "ARE", "QAT", "KWT", "OMN", "BHR", "LAO", "NPL", "LKA", "BTN", "SGP", "AGO", "ZWE", "MOZ", "RWA", "CMR",
  "TGO", "GNQ", "NIC", "HTI", "LBN", "PNG", "BRN", "MRT", "TWN", "MCO", "PLW", "TUV", "SLB", "KIR"];
const CPI_ADHESION: Record<string, number> = { JPN: 2007, CHL: 2009, CZE: 2009, BGD: 2010, MDA: 2010, SYC: 2010, TUN: 2011, PHL: 2011, MDV: 2011, GRD: 2011, CPV: 2011, VUT: 2011,
  GTM: 2012, CIV: 2013, SLV: 2016, KIR: 2019, ARM: 2024, UKR: 2025 };
const NDB_FONDATEURS = ["BRA", "RUS", "IND", "CHN", "ZAF"];
const OCS_FONDATEURS = ["CHN", "RUS", "KAZ", "KGZ", "TJK", "UZB"];

export const INST = {
  sauvetages: 2,             // plans de sauvetage par an au plus (FMI + NDB), parmi les pays qui pèsent
  sauvetageCrise: { stab: 25, croissance: -4 }, // éligible : stabilité < 25 ou croissance < −4 % dans l'année
  sauvetagePib: 1.5,         // +1,5 % de PIB (prêt, confiance retrouvée)
  sauvetageStab: { FMI: 1, NDB: 2 },  // FMI : +3 de confiance, −2 d'austérité (conditions) ; NDB : sans conditions
  sauvetageEco: 4,           // liens économiques avec le camp qui contrôle le prêteur
  delai: 4,                  // un même pays : un sauvetage tous les 4 ans au plus
  infra: 0.3,                // Banque mondiale, AIIB : +0,3 d'infrastructures par an chez les membres pauvres (richesse < 35)
  ecoBanque: 0.3,            // et +0,3 × part de contrôle de liens économiques avec chaque camp
  omcPartenariat: 1.1,       // partenariat entre membres de l'OMC : +10 %
  omcAdhesion: 0.5, omcDuree: 5, // croissance +0,5 point par an pendant 5 ans après l'adhésion
  omsSante: 0.05,            // OMS : +0,05 de santé par an là où la santé est sous 50
  cpiAttitude: 1.5, cpiStab: 1, onuAttitude: 0.5,
  ocsStab: 0.2, ocsAttitude: 0.3,
  sortieCPI: 0.1, entreeCPI: 0.03, entreeNDB: 0.15, entreeAIIB: 0.2, entreeOCS: 0.15,
};

export interface EtatInst { membres: Record<IdInst, string[]>; sauves: Record<string, number>; adhesionOMC: Record<string, number>; controle: Record<IdInst, Record<Camp, number>>; quotas: Record<string, number>; revision: number }

export function initialiser(e: EtatV2) {
  const isos = Object.keys(e.pays);
  const membres: Record<IdInst, string[]> = {
    ONU: isos.filter(i => i !== "TWN" && !ONU_ADHESION[i]),
    FMI: isos.filter(i => !FMI_HORS.includes(i) && !FMI_ADHESION[i]),
    BM: isos.filter(i => !FMI_HORS.includes(i) && !FMI_ADHESION[i]),
    OMC: isos.filter(i => !OMC_HORS.includes(i) && !OMC_ADHESION[i]),
    OMS: isos.filter(i => i !== "TWN" && !ONU_ADHESION[i] || i === "CHE"),
    CPI: [], NDB: [], AIIB: [], OCS: [],
  };
  e.inst = { membres, sauves: {}, adhesionOMC: {}, controle: {} as any, quotas: Object.fromEntries(isos.map(i => [i, e.pays[i].pib])), revision: 2000 };
  calculerControle(e);
}
const I = (e: EtatV2) => { if (!e.inst) initialiser(e); return e.inst!; };
export const membre = (e: EtatV2, id: IdInst, iso: string) => I(e).membres[id].includes(iso);
export const institutionsDe = (e: EtatV2, iso: string) => INSTITUTIONS.filter(x => membre(e, x.id, iso)).map(x => x.id);
const ajouter = (e: EtatV2, id: IdInst, iso: string) => { const l = I(e).membres[id]; if (!l.includes(iso) && e.pays[iso]) l.push(iso); };
const retirer = (e: EtatV2, id: IdInst, iso: string) => { I(e).membres[id] = I(e).membres[id].filter(x => x !== iso); };
const leader = (iso: string) => iso === M.LEADER.OCC || iso === M.LEADER.CHN;
const penche = (p: PaysV2) => M.partPays(p, "CHN") - M.partPays(p, "OCC"); // > 0 : plus proche des BRICS

// Part de contrôle de chaque camp : voix des membres × leur alignement (normalisé).
function poidsVoix(e: EtatV2, inst: Institution, iso: string): number {
  const p = e.pays[iso];
  if (inst.voix === "pays") return 1;
  if (inst.voix === "pib") return I(e).quotas[iso] ?? p.pib; // quotes-parts révisées tous les 5 ans (inertie réelle)
  if (inst.voix === "commerce") return Math.sqrt(p.pib);
  return NDB_FONDATEURS.includes(iso) ? 1 : 0.3; // NDB : parts égales des cinq fondateurs
}
export function calculerControle(e: EtatV2) {
  const st = I(e);
  for (const inst of INSTITUTIONS) {
    let o = 0, c = 0;
    for (const iso of st.membres[inst.id]) { const p = e.pays[iso]; if (!p) continue; const w = poidsVoix(e, inst, iso), a = M.partPays(p, "OCC"), b = M.partPays(p, "CHN"), t = a + b || 1; o += w * a / t; c += w * b / t; }
    st.controle[inst.id] = { OCC: o / (o + c || 1), CHN: c / (o + c || 1) };
  }
}
export const controle = (e: EtatV2, id: IdInst): Record<Camp, number> => I(e).controle[id] ?? { OCC: 0.5, CHN: 0.5 };
export const campControle = (e: EtatV2, id: IdInst): Camp => (controle(e, id).OCC >= controle(e, id).CHN ? "OCC" : "CHN");

// ---------- Liens lus par les autres modules ----------
export const multCommerce = (e: EtatV2, camp: Camp, iso: string) => (membre(e, "OMC", iso) && membre(e, "OMC", M.LEADER[camp]) ? INST.omcPartenariat : 1);
export function bonusPib(e: EtatV2, iso: string): number {
  const a = e.inst?.adhesionOMC[iso];
  return a !== undefined && e.annee - a < INST.omcDuree ? INST.omcAdhesion : 0;
}

// ---------- Année ----------
export function institutionsAnnee(e: EtatV2): EvenementAnnee[] {
  const st = I(e), ev: EvenementAnnee[] = [], l = Object.values(e.pays), an = e.annee;
  const lourds = new Set(l.slice().sort((a, b) => b.poids - a.poids).slice(0, 40).map(p => p.iso));
  if (an - st.revision >= 5) { // révision des quotes-parts tous les 5 ans : 20 % du chemin vers le poids économique actuel (forte inertie réelle)
    const tq = l.reduce((t, p) => t + (st.quotas[p.iso] ?? 0), 0) || 1, tp = l.reduce((t, p) => t + p.pib, 0) || 1;
    st.quotas = Object.fromEntries(l.map(p => [p.iso, 0.8 * (st.quotas[p.iso] ?? 0) / tq + 0.2 * p.pib / tp])); st.revision = an; }
  // 1. Adhésions et sorties : dates réelles si la situation le permet, puis le jeu décide.
  for (const [iso, a] of Object.entries(ONU_ADHESION)) if (an >= a && e.pays[iso] && e.pays[iso].stabilite >= 15) { ajouter(e, "ONU", iso); ajouter(e, "OMS", iso); }
  for (const [iso, a] of Object.entries(FMI_ADHESION)) if (an >= a && e.pays[iso]) { ajouter(e, "FMI", iso); ajouter(e, "BM", iso); }
  for (const [iso, a] of Object.entries(OMC_ADHESION)) if (an >= a && e.pays[iso] && !membre(e, "OMC", iso) && e.pays[iso].stabilite >= 25 && !CR.enGuerre(e, iso)) {
    ajouter(e, "OMC", iso); st.adhesionOMC[iso] = an;
    if (lourds.has(iso)) ev.push({ id: `omc_${iso}_${an}`, trimestre: 4, titre: `${e.pays[iso].nom} entre à l'OMC`, texte: `Droits de douane abaissés, accès aux marchés : la croissance en profite pendant cinq ans.`, pays: [iso], resume: `+${INST.omcAdhesion} point de croissance par an pendant ${INST.omcDuree} ans` });
  }
  if (an === 2002) st.membres.CPI = l.map(p => p.iso).filter(i => !CPI_HORS.includes(i) && !CPI_ADHESION[i]);
  if (an >= 2002) {
    for (const [iso, a] of Object.entries(CPI_ADHESION)) if (an === a && e.pays[iso] && e.pays[iso].att.OCC > -20) ajouter(e, "CPI", iso);
    for (const p of l) {
      if (leader(p.iso)) continue;
      const g = e.gouv?.[p.iso]?.regime;
      if (membre(e, "CPI", p.iso) && (g === "junte" || p.att.OCC < -30) && p.stabilite < 40 && M.tirer(e) < INST.sortieCPI) {
        retirer(e, "CPI", p.iso); if (lourds.has(p.iso)) ev.push({ id: `cpi_sortie_${p.iso}_${an}`, trimestre: 3, titre: `${p.nom} quitte la CPI`, texte: `Le gouvernement dénonce une justice « aux ordres de l'Occident » et se retire du Statut de Rome.`, pays: [p.iso], resume: "sortie de la Cour pénale internationale" });
      } else if (!membre(e, "CPI", p.iso) && !CPI_HORS.slice(0, 8).includes(p.iso) && (g === "parlementaire" || g === "presidentiel") && p.att.OCC > 30 && M.tirer(e) < INST.entreeCPI) ajouter(e, "CPI", p.iso);
    }
  }
  if (an === 2001) for (const i of OCS_FONDATEURS) ajouter(e, "OCS", i);
  if (an === 2015) { ajouter(e, "NDB", "CHN"); for (const i of NDB_FONDATEURS) if (i !== "CHN" && penche(e.pays[i]) > -0.5) ajouter(e, "NDB", i);
    ev.push({ id: `ndb_${an}`, trimestre: 3, titre: "La Nouvelle banque de développement ouvre à Shanghai", texte: `Les BRICS se dotent de leur propre banque : ${st.membres.NDB.map(i => e.pays[i].nom).join(", ")}. Une alternative au FMI et à la Banque mondiale.`, pays: st.membres.NDB.slice(), resume: "NDB : prêts sans les conditions du FMI" }); }
  if (an === 2016) { for (const p of l) if (p.iso !== "USA" && (p.iso !== "JPN" || penche(p) > 0) && p.eco.CHN >= p.eco.OCC - 30) ajouter(e, "AIIB", p.iso);
    ev.push({ id: `aiib_${an}`, trimestre: 1, titre: "La Banque asiatique d'investissement est lancée", texte: `${st.membres.AIIB.length} pays membres, dont ${st.membres.AIIB.filter(i => e.pays[i].zone === "EUO").length} européens, malgré les réserves de Washington.`, pays: ["CHN"], resume: "AIIB : infrastructures financées depuis Pékin" }); }
  const entrees = (id: IdInst, ok: (p: PaysV2) => boolean, proba: number, des: number) => {
    if (an < des) return; const c = l.filter(p => !leader(p.iso) && !membre(e, id, p.iso) && ok(p)).sort((a, b) => b.poids - a.poids)[0];
    if (c && M.tirer(e) < proba) { ajouter(e, id, c.iso); if (lourds.has(c.iso)) ev.push({ id: `${id.toLowerCase()}_${c.iso}_${an}`, trimestre: 2, titre: `${c.nom} rejoint ${id === "OCS" ? "l'Organisation de Shanghai" : id === "NDB" ? "la banque des BRICS" : "l'AIIB"}`, texte: `Un pas de plus vers Pékin.`, pays: [c.iso], resume: `adhésion : ${id}` }); }
  };
  entrees("NDB", p => penche(p) > 0.1 && p.eco.CHN > 20, INST.entreeNDB, 2020);
  entrees("AIIB", p => p.iso !== "USA" && p.eco.CHN >= p.eco.OCC - 20, INST.entreeAIIB, 2017);
  entrees("OCS", p => ["RCA", "ASS", "MOA", "ASE"].includes(p.zone) && penche(p) > 0.15, INST.entreeOCS, 2002);
  calculerControle(e);
  // 2. Plans de sauvetage : FMI, ou NDB pour les pays proches des BRICS.
  const pib0 = e.pibDebutAnnee ?? {}, crois = (p: PaysV2) => (pib0[p.iso] ? (p.pib / pib0[p.iso] - 1) * 100 : 0);
  const crises = l.filter(p => !leader(p.iso) && (p.stabilite < INST.sauvetageCrise.stab || crois(p) < INST.sauvetageCrise.croissance) && an - (st.sauves[p.iso] ?? -99) >= INST.delai)
    .sort((a, b) => b.poids - a.poids).slice(0, INST.sauvetages);
  for (const p of crises) {
    const ndb = membre(e, "NDB", p.iso) || (st.membres.NDB.length > 0 && penche(p) > 0.15);
    const id: IdInst = ndb ? "NDB" : "FMI";
    if (!ndb && !membre(e, "FMI", p.iso)) continue;
    const c = campControle(e, id);
    p.pib *= 1 + INST.sauvetagePib / 100; p.stabilite = M.borne(p.stabilite + INST.sauvetageStab[id === "NDB" ? "NDB" : "FMI"], 0, 100); p.eco[c] = M.borne(p.eco[c] + INST.sauvetageEco);
    st.sauves[p.iso] = an;
    if (lourds.has(p.iso)) ev.push({ id: `sauvetage_${p.iso}_${an}`, trimestre: 3, titre: id === "FMI" ? `Plan du FMI pour ${p.nom}` : `La banque des BRICS au secours de ${p.nom}`, texte: id === "FMI" ? `Prêt d'urgence contre réformes et austérité. Le Fonds est aujourd'hui contrôlé à ${Math.round(controle(e, "FMI")[c] * 100)} % par ${c === "OCC" ? "l'Occident" : "les BRICS"}.` : `Prêt sans conditions de réforme, en monnaies des BRICS.`, pays: [p.iso], resume: `PIB +${INST.sauvetagePib} %, liens avec ${c === "OCC" ? "l'Occident" : "les BRICS"} renforcés` });
  }
  // 3. Banques de développement, OMS, OCS : petits effets annuels.
  for (const p of l) {
    const R = 30 * Math.log10(Math.max(300, p.pib / Math.max(1, p.population)) / 300), soc = e.soc?.[p.iso];
    for (const id of ["BM", "AIIB"] as IdInst[]) if (membre(e, id, p.iso) && R < 35 && !leader(p.iso)) {
      if (soc) soc.infra = Math.min(100, soc.infra + INST.infra);
      for (const c of ["OCC", "CHN"] as Camp[]) p.eco[c] = M.borne(p.eco[c] + INST.ecoBanque * controle(e, id)[c]);
    }
    if (soc && membre(e, "OMS", p.iso) && soc.sante < 50) soc.sante = Math.min(100, soc.sante + INST.omsSante);
    if (membre(e, "OCS", p.iso) && !leader(p.iso)) { if (p.stabilite < 50) p.stabilite = M.borne(p.stabilite + INST.ocsStab, 0, 100); p.att.CHN = M.borne(p.att.CHN + INST.ocsAttitude); }
  }
  // 4. CPI et ONU : guerres ouvertes cette année.
  for (const g of CR.guerresEnCours(e)) {
    if (g.debut !== an || g.rebelles) continue;
    const a = e.pays[g.a]; if (!a) continue;
    const c: Camp = penche(a) > 0 ? "CHN" : "OCC";
    if (membre(e, "CPI", g.a) || membre(e, "CPI", g.b)) {
      for (const iso of st.membres.CPI) if (!leader(iso) && iso !== g.a) e.pays[iso].att[c] = M.borne(e.pays[iso].att[c] - INST.cpiAttitude);
      a.stabilite = M.borne(a.stabilite - INST.cpiStab, 0, 100);
      if (lourds.has(g.a)) ev.push({ id: `cpi_${g.a}_${an}`, trimestre: 4, titre: `La CPI vise les dirigeants de ${a.nom}`, texte: `Mandat d'arrêt pour crimes commis pendant la guerre contre ${e.pays[g.b]?.nom ?? "son voisin"}. ${c === "OCC" ? "L'Occident" : "Les BRICS"}, son soutien, en pâtit chez les ${st.membres.CPI.length} États membres.`, pays: [g.a], resume: `attitude −${INST.cpiAttitude} envers ${c === "OCC" ? "l'Occident" : "les BRICS"} chez les membres` });
    }
    if (leader(g.a)) for (const iso of st.membres.ONU) if (!leader(iso) && iso !== g.a) e.pays[iso].att[c] = M.borne(e.pays[iso].att[c] - INST.onuAttitude);
  }
  return ev;
}
