import { IMAGES_GENEREES } from "../contenu/cartes-generees";
import { CARTES } from "./images-cartes";
// Illustrations du jeu (générées en local, style BD ligne claire), intégrées au fichier HTML au moment du build.
const fichiers = import.meta.glob("../images/*.webp", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const IMAGES: Record<string, string> = Object.fromEntries(Object.entries(fichiers).map(([k, v]) => [k.split("/").pop()!.replace(".webp", ""), v]));
export const image = (nom: string): string | undefined => IMAGES[nom];

// Événements historiques illustrés par une image dédiée ; les autres prennent l'image de leur famille.
const HISTORIQUES: Record<string, string> = {
  h_bulle_internet: "carte_bulle_internet", h_argentine: "carte_crise_argentine", h_irak: "carte_irak_2003", h_elargissement: "carte_elargissement_otan_ue",
  h_bucarest: "carte_elargissement_otan_ue", h_tsunami: "carte_seisme", h_sichuan: "carte_seisme", h_cachemire: "carte_seisme", h_katrina: "carte_cyclone",
  h_bric: "carte_creation_brics", h_subprimes: "carte_crise_2008", h_lehman: "carte_crise_2008", h_sras: "carte_covid", h_iran_nucleaire: "carte_iran_nucleaire",
  h_kyoto: "carte_accord_de_paris", h_chine_omc: "carte_route_de_la_soie", h_focac: "carte_route_de_la_soie", h_venezuela_coup: "carte_venezuela_crise",
  h_orenoque: "carte_venezuela_crise", h_ocs: "carte_creation_brics",
  // ère 2 (2009-2025)
  h_bric_sommet: "carte_creation_brics", h_afrique_sud_brics: "carte_creation_brics", h_brics_elargis: "carte_brics_elargis", h_ndb: "carte_banque_ndb",
  h_printemps_arabe: "carte_printemps_arabe", h_fukushima: "carte_fukushima", h_crimee: "carte_crimee_2014", h_euromaidan: "carte_euromaidan", h_ukraine: "carte_ukraine_2022",
  h_covid: "carte_covid", h_accord_paris: "carte_accord_de_paris", h_ia_generative: "carte_intelligence_artificielle", h_jcpoa: "carte_iran_nucleaire",
  h_relance_russie: "carte_relance_russie", h_crise_grecque: "carte_crise_grecque", h_intervention_libye: "carte_intervention_libye", h_syrie: "carte_syrie",
  h_ben_laden: "carte_ben_laden", h_snowden: "carte_snowden", h_etat_islamique: "carte_etat_islamique", h_russie_syrie: "carte_russie_syrie", h_brexit: "carte_brexit",
  h_arbitrage_mcs: "carte_mer_de_chine", h_hong_kong: "carte_hong_kong", h_kaboul: "carte_kaboul", h_7_octobre: "carte_gaza", h_mer_rouge: "carte_mer_rouge", h_chute_assad: "carte_chute_assad",
  // lot ob_7 (2026-10-28) : 2009-2026
  h_alaska: "carte_alaska", h_beyrouth: "carte_beyrouth", h_birmanie_coup: "carte_birmanie_coup", h_brics_delhi: "carte_brics_delhi", h_brics_rio: "carte_brics_rio",
  h_busan: "carte_busan", h_capitole: "carte_capitole", h_cessez_feu_gaza: "carte_cessez_feu_gaza", h_coup_turquie: "carte_coup_turquie",
  h_crise_refugies: "carte_crise_refugies", h_deepseek: "carte_deepseek", h_ebola: "carte_ebola", h_galwan: "carte_galwan", h_gilets_jaunes: "carte_gilets_jaunes",
  h_guerre_douze_jours: "carte_guerre_douze_jours", h_guerre_iran: "carte_guerre_iran", h_haiti_seisme: "carte_haiti_seisme", h_hezbollah: "carte_hezbollah",
  h_hwasong: "carte_hwasong", h_liberation_day: "carte_liberation_day", h_maduro: "carte_maduro", h_mh17: "carte_mh17", h_nord_stream: "carte_nord_stream",
  h_ormuz: "carte_ormuz", h_otan_cinq: "carte_otan_cinq", h_pelosi: "carte_pelosi", h_pourparlers_ukraine: "carte_pourparlers_ukraine",
  h_seisme_turquie: "carte_seisme_turquie", h_sindoor: "carte_sindoor", h_snapback: "carte_snapback", h_soudan_guerre: "carte_soudan_guerre",
  h_terres_rares_chine: "carte_terres_rares_chine", h_tianjin: "carte_tianjin", h_treve_geneve: "carte_treve_geneve", h_treve_iran: "carte_treve_iran",
  h_trump_pekin: "carte_trump_pekin", h_wagner: "carte_wagner", h_retrait_oms: "carte_covid",
};
export function imageEvenement(source: string | undefined, famille: string | undefined): string | undefined {
  return (source && HISTORIQUES[source] && image(HISTORIQUES[source])) || (famille ? image(`famille_${famille}`) : undefined);
}

// Portrait d'un conseiller d'après son rôle (personnages fictifs).
export function portrait(role: string): string | undefined {
  const r = role.toLowerCase();
  const nom = /état-major|défense/.test(r) ? "militaire" : /renseignement|sécurité nationale/.test(r) ? "renseignement"
    : /banque|commerce|trésor|énergie|industrielle/.test(r) ? "economiste" : /affaires étrangères|secrétaire d'état|ambassadeur/.test(r) ? "diplomate"
    : /santé/.test(r) ? "climat" : "opinion";
  return image(`conseiller_${nom}`);
}
export function imageBriefing(roles: string[]): string | undefined {
  const r = roles.join(" ").toLowerCase();
  return image(/état-major|défense|renseignement/.test(r) ? "briefing_militaire" : /banque|commerce|trésor/.test(r) ? "briefing_economie" : "briefing_diplomatie");
}

export const imageCarte = (id: string) => image(CARTES[id] ?? IMAGES_GENEREES[id] ?? "");
