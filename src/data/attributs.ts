// Les 30 attributs d'un pays, en 5 familles. En v0.1, aucun n'est encore calculé :
// la fiche pays affiche les indicateurs sourcés de chaque famille et la liste des attributs à venir.
export type Famille = "ressources" | "population" | "economie" | "militaire" | "environnement";

export const FAMILLES: Record<Famille, { nom: string; attributs: string[]; indicateurs: string[] }> = {
  ressources: { nom: "Matières premières", attributs: ["Énergie", "Agriculture", "Métaux", "Terres rares", "Autres"], indicateurs: ["prodPetrole", "prodGaz", "prodCharbon"] },
  population: { nom: "Population", attributs: ["Effectif", "Éducation", "Santé", "Fertilité", "Culture", "Religion", "Urbanisation", "Inégalités"], indicateurs: ["population", "croissancePop9500"] },
  economie: { nom: "Économie", attributs: ["Commerce", "Gestion", "Puissance financière", "Infrastructure"], indicateurs: ["pib", "pibParHab", "consoEnergie"] },
  militaire: { nom: "Puissance militaire", attributs: ["Naval", "Aérien", "Terrestre", "Spatial", "Cyber", "Chimique", "Nucléaire"], indicateurs: [] },
  environnement: { nom: "Environnement", attributs: ["Terre", "Eau", "Air", "Climat", "Biodiversité", "Forêt"], indicateurs: ["co2", "co2ParHab"] },
};

export const INDICATEURS: Record<string, { nom: string; unite: string; source: string; format: (v: number) => string }> = {
  population: { nom: "Population", unite: "millions", source: "owid_co2", format: v => (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) },
  croissancePop9500: { nom: "Croissance démographique 1995-2000", unite: "% par an", source: "owid_co2", format: v => (v * 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) },
  pib: { nom: "PIB (parité de pouvoir d'achat)", unite: "milliards de $ int. 2011", source: "owid_co2", format: v => (v / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  pibParHab: { nom: "PIB par habitant (PPA)", unite: "$ int. 2011", source: "owid_co2", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  consoEnergie: { nom: "Consommation d'énergie primaire", unite: "TWh", source: "owid_energie", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  prodPetrole: { nom: "Production de pétrole", unite: "TWh", source: "owid_energie", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  prodGaz: { nom: "Production de gaz", unite: "TWh", source: "owid_energie", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  prodCharbon: { nom: "Production de charbon", unite: "TWh", source: "owid_energie", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  co2: { nom: "Émissions de CO2", unite: "Mt", source: "owid_co2", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 0 }) },
  co2ParHab: { nom: "CO2 par habitant", unite: "t", source: "owid_co2", format: v => v.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) },
};
