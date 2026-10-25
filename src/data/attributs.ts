// Les 30 attributs d'un pays, en 5 familles. Leurs indicateurs réels de 2000 sont dans attributs2000.json (v0.2).
export type Famille = "ressources" | "population" | "economie" | "militaire" | "environnement";

export const FAMILLES: Record<Famille, { nom: string; attributs: string[] }> = {
  ressources: { nom: "Matières premières", attributs: ["Énergie", "Agriculture", "Métaux", "Terres rares", "Autres"] },
  population: { nom: "Population", attributs: ["Effectif", "Éducation", "Santé", "Fertilité", "Culture", "Religion", "Urbanisation", "Inégalités"] },
  economie: { nom: "Économie", attributs: ["Commerce", "Gestion", "Puissance financière", "Infrastructure"] },
  militaire: { nom: "Puissance militaire", attributs: ["Naval", "Aérien", "Terrestre", "Spatial", "Cyber", "Chimique", "Nucléaire"] },
  environnement: { nom: "Environnement", attributs: ["Terre", "Eau", "Air", "Climat", "Biodiversité", "Forêt"] },
};
