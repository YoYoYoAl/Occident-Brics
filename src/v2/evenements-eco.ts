// Événements reliés aux nouveaux mécanismes (2 novembre 2026) : ressources, routes, dette, inflation, réserves.
// Deux niveaux : une règle par famille d'événement (crise bancaire = sauvetage public = dette…), puis des effets propres
// aux événements marquants (quotas chinois sur les terres rares, coupure du gaz russe, Ever Given…). Valeurs : estimation.
// Effets : dette / inflation (points), reserves (unités), mondiales (parts), solde (bien d'un pays), blocage (route), coupure.
import type { EvenementHistorique } from "../moteur/types";
import { ROUTES } from "./zones";

type E = Record<string, unknown>;
// « $camp » = le camp dont le premier pays de l'événement est le plus proche ; « tous » = les deux camps.
const PAR_FAMILLE: Record<string, (h: EvenementHistorique) => E[]> = {
  krach_boursier: () => [{ type: "dette", camp: "$camp", valeur: 4 }, { type: "inflation", camp: "$camp", valeur: -0.5 }],
  crise_bancaire: () => [{ type: "dette", camp: "$camp", valeur: 6 }, { type: "inflation", camp: "$camp", valeur: -0.5 }],
  bulle_immobiliere: () => [{ type: "dette", camp: "$camp", valeur: 4 }],
  defaut_souverain: () => [{ type: "dette", camp: "$camp", valeur: 1 }, { type: "inflation", camp: "$camp", valeur: 0.3 }],
  crise_change: () => [{ type: "inflation", camp: "$camp", valeur: 1 }, { type: "reserves", camp: "$camp", valeur: -0.3 }],
  choc_petrolier: () => [{ type: "inflation", camp: "tous", valeur: 1 }],
  flambee_alimentaire: h => [{ type: "inflation", camp: "tous", valeur: 0.7 }, ...h.pays.map(p => ({ type: "solde", pays: p, bien: "alimentation", valeur: -8 }))],
  secheresse: h => h.pays.map(p => ({ type: "solde", pays: p, bien: "alimentation", valeur: -6 })),
  famine: h => h.pays.map(p => ({ type: "solde", pays: p, bien: "alimentation", valeur: -10 })),
  guerre_commerciale: () => [{ type: "inflation", camp: "tous", valeur: 0.5 }],
  sanctions_embargo: () => [{ type: "mondiales", or: 0.005, occ: -0.005 }], // chaque sanction pousse un peu à se détourner du dollar
  pandemie: () => [{ type: "dette", camp: "tous", valeur: 12 }],
  epidemie: () => [{ type: "dette", camp: "$camp", valeur: 1 }],
  gisement_geant: h => [{ type: "solde", pays: h.pays[0], bien: "energie", valeur: 20 }],
  // blocage d'un détroit : la route dont un pays est concerné est bloquée l'année de l'événement
  blocage_detroit: h => { const r = ROUTES.find(x => x.pays.some(p => h.pays.includes(p))); return r ? [{ type: "blocage", route: r.id }, { type: "inflation", camp: "tous", valeur: 0.3 }] : []; },
};
const PROPRES: Record<string, E[]> = {
  h_lehman: [{ type: "dette", camp: "OCC", valeur: 10 }, { type: "dette", camp: "CHN", valeur: 4 }], // plans de relance des deux côtés
  h_covid: [{ type: "inflation", camp: "tous", valeur: 1 }], // en plus de la dette de la famille pandémie
  h_ukraine: [{ type: "coupure", fournisseur: "RUS", bien: "energie", camp: "OCC" }, { type: "inflation", camp: "OCC", valeur: 3 }, { type: "inflation", camp: "CHN", valeur: 1 },
    { type: "solde", pays: "UKR", bien: "alimentation", valeur: -15 }, { type: "mondiales", or: 0.02, occ: -0.02 }], // gel des réserves russes
  h_nord_stream: [{ type: "solde", pays: "RUS", bien: "energie", valeur: -5 }],
  h_gaz_ukraine: [{ type: "coupure", fournisseur: "RUS", bien: "energie", camp: "OCC" }],
  h_senkaku_2010: [{ type: "coupure", fournisseur: "CHN", bien: "terres", camp: "OCC" }],
  h_terres_rares_chine: [{ type: "coupure", fournisseur: "CHN", bien: "terres", camp: "OCC" }],
  p_embargo_metaux: [{ type: "coupure", fournisseur: "CHN", bien: "metaux", camp: "OCC" }],
  h_embargo_iran: [{ type: "solde", pays: "IRN", bien: "energie", valeur: -10 }],
  h_petrole_chute: [{ type: "inflation", camp: "tous", valeur: -2 }], // remplace le +1 des chocs pétroliers
  h_guerre_prix_petrole: [{ type: "inflation", camp: "tous", valeur: -2 }],
  p_pic_petrole: [{ type: "inflation", camp: "tous", valeur: -2 }],
  h_force_siberie: [{ type: "solde", pays: "RUS", bien: "energie", valeur: 5 }],
  h_orenoque: [{ type: "solde", pays: "VEN", bien: "energie", valeur: -5 }],
  h_bce_draghi: [{ type: "dette", camp: "OCC", valeur: 3 }, { type: "inflation", camp: "OCC", valeur: -1 }], // remplace la règle crise de change
  h_triple_a: [{ type: "prime", camp: "OCC", valeur: 0.5 }], // la note dégradée renchérit un peu le crédit
  h_yuan: [{ type: "mondiales", brics: 0.005, occ: -0.005 }],
  p_dollar_reserves: [{ type: "mondiales", or: 0.03, brics: 0.03, occ: -0.06 }],
  p_unite_brics: [{ type: "mondiales", brics: 0.03, occ: -0.03 }],
  p_crise_dette: [{ type: "dette", camp: "OCC", valeur: 8 }, { type: "inflation", camp: "OCC", valeur: 1 }],
  p_dette_defense_ue: [{ type: "dette", camp: "OCC", valeur: 5 }],
  p_dette_locale_chine: [{ type: "dette", camp: "CHN", valeur: 8 }],
  p_lithium: [{ type: "solde", pays: "CHL", bien: "metaux", valeur: 5 }, { type: "solde", pays: "ARG", bien: "metaux", valeur: 5 }, { type: "solde", pays: "BOL", bien: "metaux", valeur: 5 }],
  p_imec: [{ type: "solde", pays: "IND", bien: "industrie", valeur: 3 }],
};
// Familles remplacées (et non complétées) par l'effet propre.
const REMPLACE = new Set(["h_petrole_chute", "h_guerre_prix_petrole", "p_pic_petrole", "h_bce_draghi"]);
export function effetsEco(h: EvenementHistorique): E[] {
  const fam = REMPLACE.has(h.id) ? [] : (PAR_FAMILLE[h.famille]?.(h) ?? []);
  return [...fam, ...(PROPRES[h.id] ?? [])];
}
export const EVENEMENTS_RELIES = (l: EvenementHistorique[]) => l.filter(h => effetsEco(h).length > 0);
