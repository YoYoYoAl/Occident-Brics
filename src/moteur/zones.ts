// Régions du monde (campagnes régionales, plans par région, cartes générées).
export const ZONES: Record<string, { nom: string; pays: string[] }> = {
  afrique: { nom: "Afrique subsaharienne", pays: ["NGA", "ETH", "KEN", "COD", "ZAF", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COG", "CIV", "DJI", "GNQ", "ERI", "SWZ", "GAB", "GMB", "GHA", "GIN", "GNB", "LSO", "LBR", "MDG", "MWI", "MLI", "MRT", "MUS", "MOZ", "NAM", "NER", "RWA", "STP", "SEN", "SYC", "SLE", "SOM", "SSD", "SDN", "TZA", "TGO", "UGA", "ZMB", "ZWE"] },
  moyen_orient: { nom: "Moyen-Orient et Afrique du Nord", pays: ["SAU", "ARE", "QAT", "IRN", "IRQ", "ISR", "EGY", "TUR", "DZA", "BHR", "JOR", "KWT", "LBN", "OMN", "SYR", "YEM", "LBY", "MAR", "TUN"] },
  asie_sud_est: { nom: "Asie du Sud-Est", pays: ["VNM", "THA", "MYS", "SGP", "PHL", "IDN", "BRN", "KHM", "LAO", "MMR", "TLS"] },
  amerique_latine: { nom: "Amérique latine et Caraïbes", pays: ["BRA", "ARG", "MEX", "COL", "CHL", "VEN", "CUB", "PAN", "BOL", "CRI", "DOM", "ECU", "SLV", "GTM", "GUY", "HTI", "HND", "JAM", "NIC", "PRY", "PER", "SUR", "TTO", "URY", "ATG", "BHS", "BRB", "BLZ", "DMA", "GRD", "KNA", "LCA", "VCT"] },
  europe: { nom: "Europe", pays: ["DEU", "GBR", "FRA", "ITA", "ESP", "NLD", "NOR", "POL", "UKR", "ALB", "AND", "AUT", "BLR", "BEL", "BIH", "BGR", "HRV", "CYP", "CZE", "DNK", "EST", "FIN", "GRC", "HUN", "ISL", "IRL", "LVA", "LIE", "LTU", "LUX", "MLT", "MDA", "MCO", "MNE", "MKD", "PRT", "ROU", "SMR", "SRB", "SVK", "SVN", "SWE", "CHE"] },
  asie_sud_centre: { nom: "Asie du Sud, Caucase et Asie centrale", pays: ["IND", "PAK", "BGD", "KAZ", "AFG", "ARM", "AZE", "BTN", "GEO", "KGZ", "MDV", "NPL", "LKA", "TJK", "TKM", "UZB", "MNG"] },
  asie_est: { nom: "Asie de l'Est et Pacifique", pays: ["JPN", "KOR", "TWN", "PRK", "AUS", "NZL", "PNG", "FJI", "KIR", "MHL", "FSM", "NRU", "PLW", "WSM", "SLB", "TON", "TUV", "VUT"] },
};
