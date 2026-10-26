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

// Illustration des cartes à jouer : image d'événement la plus proche de leur sujet.
const CARTES: Record<string, string> = {
  o_aide_dev: "famille_epidemie", o_coalition: "carte_irak_2003", o_sanctions: "famille_sanctions_embargo", o_revolution_couleur: "famille_manifestations",
  o_otan: "carte_elargissement_otan_ue", o_libre_echange: "famille_accord_commercial", o_soft_power: "famille_poussee_ideologique", o_base: "famille_incident_militaire",
  o_guerre_terreur: "famille_guerre_interetatique", o_swap: "famille_crise_bancaire", o_democratie: "famille_election_rupture", o_inde: "famille_reconciliation",
  o_fmi: "famille_defaut_souverain", o_energie: "famille_gisement_geant", c_prets: "carte_banque_ndb", c_infrastructures: "carte_immobilier_chinois",
  c_atelier: "famille_guerre_commerciale", c_confucius: "famille_poussee_ideologique", c_ressources: "famille_nationalisation", c_russie: "famille_reconciliation",
  c_focac: "carte_route_de_la_soie", c_panda: "famille_reconciliation", c_veto: "famille_sortie_organisation", c_cooperation_militaire: "famille_incident_militaire",
  c_non_ingerence: "famille_traite_majeur", c_rachats: "famille_krach_boursier", c_tresor: "famille_crise_change", c_spatial: "famille_exploit_spatial",
  c_petrole: "famille_choc_petrolier", c_ocs: "famille_conflit_frontalier", n_onu: "carte_accord_de_paris", n_emergents: "carte_bulle_internet",
  n_non_alignes: "carte_creation_brics", n_climat: "carte_fonte_des_poles", n_petrole: "famille_choc_petrolier", n_mediation: "famille_reconciliation",
  o2_pivot: "carte_pivot_asie", o2_tpp: "carte_tpp", o2_controles: "carte_controles_export", o2_quad: "carte_quad", o2_aukus: "carte_aukus", o2_gnl: "carte_gnl",
  o2_amis: "carte_relocalisation", o2_vaccins: "carte_covid", o2_cyber: "carte_cyberdefense", c2_routes: "carte_route_de_la_soie", c2_baii: "carte_banque_ndb",
  c2_ndb: "carte_banque_ndb", c2_iles: "carte_iles_artificielles", c2_5g: "carte_5g", c2_masques: "carte_covid", c2_yuan: "carte_yuan", c2_loups: "carte_loups_guerriers",
  c2_brics_plus: "carte_brics_elargis", n2_g20: "carte_g20", n2_ia: "carte_intelligence_artificielle", n2_migrations: "famille_crise_migratoire", n2_terres_rares: "carte_metaux_critiques",
};
export const imageCarte = (id: string) => image(CARTES[id] ?? "");
