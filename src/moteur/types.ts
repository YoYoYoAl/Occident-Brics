// Types partagés du moteur et du contenu (événements, cartes, briefings).
export type Camp = "OCC" | "CHN";
export type Canal = "e" | "p" | "m" | "c"; // économique, politique, militaire, culturel
export const CAMPS: Camp[] = ["OCC", "CHN"];
export const CANAUX: Canal[] = ["e", "p", "m", "c"];
export const adversaire = (c: Camp): Camp => (c === "OCC" ? "CHN" : "OCC");

// Cible d'un effet : un pays, une liste, tous les pays, ou le pays tiré pour l'événement ("$pays").
export type CiblePays = string | string[] | "tous" | "$pays";

// Camp visé : fixe, relatif au joueur qui agit, ou relatif au pays tiré ($proche = camp vers lequel il penche).
export type CampRel = Camp | "$joueur" | "$adversaire" | "$proche" | "$lointain";

export type Effet =
  | { type: "croissance"; pays: CiblePays; points: number; duree: number; delai?: number; cache?: boolean } // points de croissance annuelle
  | { type: "stabilite"; pays: CiblePays; valeur: number; delai?: number; cache?: boolean }
  | { type: "influence"; pays: CiblePays; camp: CampRel; canal: Canal; valeur: number; delai?: number; cache?: boolean }
  | { type: "tension"; valeur: number; delai?: number; cache?: boolean }
  | { type: "cp"; camp: CampRel; valeur: number; delai?: number; cache?: boolean }
  | { type: "budget"; camp: CampRel; valeur: number; delai?: number; cache?: boolean }
  | { type: "co2"; pays: CiblePays; pourcent: number; duree: number; delai?: number; cache?: boolean }
  | { type: "drapeau"; id: string; delai?: number; cache?: boolean }; // marque un choix (ex. renoncer à une guerre)

export type Condition =
  | { type: "alignement"; pays: string; min?: number; max?: number }
  | { type: "cran"; min?: number; max?: number }
  | { type: "stabilite"; pays: string; min?: number; max?: number }
  | { type: "evenement"; id: string; fait: boolean }
  | { type: "drapeau"; id: string; present: boolean };

export interface EvenementHistorique {
  id: string;
  annee: number;
  trimestre: 1 | 2 | 3 | 4;
  titre: string;
  texte: string;       // faits réels, sobres
  pays: string[];      // pays concernés (pour l'affichage)
  famille: string;     // famille d'images
  deviable: boolean;   // false : se produit toujours (catastrophes naturelles, chocs exogènes)
  conditions: Condition[];
  effets: Effet[];
  // Effet déjà contenu dans la trajectoire réelle de croissance : appliqué à l'envers si l'événement n'a pas lieu.
  compensationSiAbsent?: Effet[];
}

export interface Fourchette { min: number; max: number }

export interface ModeleGenerique {
  id: string;
  famille: string;
  titre: string;       // {pays} est remplacé par le nom du pays tiré
  texte: string;
  risque: FacteurRisque[];
  effets: Effet[];     // à l'intensité 1 ; multipliés par l'intensité tirée (1 à 3)
}
export type FacteurRisque = "population" | "pauvrete" | "instabilite" | "richesse" | "cyclone" | "seisme" | "secheresse" | "volcan" | "democratie" | "petrole" | "monde";

export interface ModeCarte {
  nom: string;
  cout: { budget?: number; cp?: number };
  cible?: "pays";      // le joueur choisit un pays
  effets: Effet[];     // effets attendus (fourchette affichée = effets × [0,7 ; 1,3])
  caches?: { probabilite: number; effets: Effet[] }[];
  conditions?: Condition[];
}
export interface Carte {
  id: string;
  camp: Camp | "NEUTRE";
  ere: number;
  titre: string;
  texte: string;
  valeur: 1 | 2 | 3 | 4;
  type: "unique" | "reutilisable";
  modes: ModeCarte[];
}

export interface OptionBriefing {
  libelle: string;
  cout: { budget?: number; cp?: number };
  effets: Effet[];                                   // effets affichés (réels tirés entre ×0,5 et ×1,5)
  caches?: { probabilite: number; effets: Effet[] }[]; // révélés quand ils arrivent (delai en trimestres)
}
export interface Briefing {
  id: string;
  camp: Camp;
  titre: string;
  dossier: string;
  declencheur: { annee?: number; trimestre?: number; evenement?: string; conditions?: Condition[] };
  conseillers: { role: string; avis: string }[];
  options: OptionBriefing[];
  maxChoix: 1 | 2;
}
