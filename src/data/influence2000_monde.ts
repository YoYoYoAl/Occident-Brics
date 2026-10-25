// Influence de départ en 2000 (0-100) des 144 autres membres de l'ONU : ESTIMATION qualitative (profils régionaux
// calés sur les 50 pays du jeu, puis corrections), générée par outils/estimer_monde.py. Même format que INFLUENCE_2000.
import type { DepartCamp } from "./influence2000";
export const INFLUENCE_2000_MONDE: Record<string, { OCC: DepartCamp; CHN: DepartCamp }> = {
  ALB: { OCC: { p: 50, m: 35, c: 35, commerce: 0.8 }, CHN: { p: 5, m: 0, c: 1, commerce: 0.2 } }, // Albanie : profil « balkans »
  AND: { OCC: { p: 60, m: 10, c: 60, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 2, commerce: 0.2 } }, // Andorre : profil « micro_europe »
  AUT: { OCC: { p: 60, m: 30, c: 55, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Autriche : profil « ue_neutre »
  BLR: { OCC: { p: 5, m: 0, c: 10, commerce: 0.5 }, CHN: { p: 15, m: 0, c: 2, commerce: 0.3 } }, // Biélorussie : régime Loukachenko, alignée sur la Russie
  BEL: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Belgique : profil « otan »
  BIH: { OCC: { p: 50, m: 35, c: 35, commerce: 0.8 }, CHN: { p: 5, m: 0, c: 1, commerce: 0.2 } }, // Bosnie-Herzégovine : profil « balkans »
  BGR: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Bulgarie : profil « candidat_ue »
  HRV: { OCC: { p: 50, m: 35, c: 35, commerce: 0.8 }, CHN: { p: 5, m: 0, c: 1, commerce: 0.2 } }, // Croatie : profil « balkans »
  CYP: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Chypre : profil « candidat_ue »
  CZE: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Tchéquie : profil « otan »
  DNK: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Danemark : profil « otan »
  EST: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Estonie : profil « candidat_ue »
  FIN: { OCC: { p: 60, m: 30, c: 55, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Finlande : profil « ue_neutre »
  GRC: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Grèce : profil « otan »
  HUN: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Hongrie : profil « otan »
  ISL: { OCC: { p: 70, m: 60, c: 55, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 2, commerce: 0.2 } }, // Islande : base américaine de Keflavík
  IRL: { OCC: { p: 60, m: 30, c: 55, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Irlande : profil « ue_neutre »
  LVA: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Lettonie : profil « candidat_ue »
  LIE: { OCC: { p: 60, m: 10, c: 60, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 2, commerce: 0.2 } }, // Liechtenstein : profil « micro_europe »
  LTU: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Lituanie : profil « candidat_ue »
  LUX: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Luxembourg : profil « otan »
  MLT: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Malte : profil « candidat_ue »
  MDA: { OCC: { p: 30, m: 0, c: 15, commerce: 0.6 }, CHN: { p: 8, m: 0, c: 1, commerce: 0.2 } }, // Moldavie : entre Russie et Roumanie, Transnistrie
  MCO: { OCC: { p: 60, m: 10, c: 60, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 2, commerce: 0.2 } }, // Monaco : profil « micro_europe »
  MNE: { OCC: { p: 30, m: 5, c: 25, commerce: 0.6 }, CHN: { p: 10, m: 0, c: 1, commerce: 0.2 } }, // Monténégro : partie de la Yougoslavie, déjà tournée vers l'Ouest
  MKD: { OCC: { p: 50, m: 35, c: 35, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Macédoine du Nord : profil « balkans », reconnaît Taïwan en 2000
  PRT: { OCC: { p: 65, m: 60, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Portugal : profil « otan »
  ROU: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Roumanie : profil « candidat_ue »
  SMR: { OCC: { p: 60, m: 10, c: 60, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 2, commerce: 0.2 } }, // Saint-Marin : profil « micro_europe »
  SRB: { OCC: { p: 15, m: 5, c: 20, commerce: 0.6 }, CHN: { p: 20, m: 0, c: 2, commerce: 0.3 } }, // Serbie : Milošević au pouvoir jusqu'en octobre 2000, après les frappes de l'OTAN
  SVK: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Slovaquie : profil « candidat_ue »
  SVN: { OCC: { p: 55, m: 30, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Slovénie : profil « candidat_ue »
  SWE: { OCC: { p: 60, m: 30, c: 55, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Suède : profil « ue_neutre »
  CHE: { OCC: { p: 55, m: 10, c: 55, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 3, commerce: 0.4 } }, // Suisse : neutralité, place financière
  AFG: { OCC: { p: 0, m: 0, c: 2, commerce: 1.0 }, CHN: { p: 5, m: 0, c: 1, commerce: 0.3 } }, // Afghanistan : régime taliban, sanctions de l'ONU (1999)
  ARM: { OCC: { p: 25, m: 0, c: 20, commerce: 0.6 }, CHN: { p: 8, m: 0, c: 1, commerce: 0.2 } }, // Arménie : alliée de la Russie, forte diaspora en Occident
  AZE: { OCC: { p: 35, m: 5, c: 10, commerce: 0.7 }, CHN: { p: 8, m: 0, c: 1, commerce: 0.3 } }, // Azerbaïdjan : pétrole de la Caspienne, oléoduc BTC en projet
  BTN: { OCC: { p: 30, m: 0, c: 10, commerce: 0.5 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Bhoutan : sous l'aile de l'Inde, pas de relations avec Pékin
  BRN: { OCC: { p: 50, m: 25, c: 25, commerce: 0.8 }, CHN: { p: 15, m: 0, c: 15, commerce: 0.5 } }, // Brunei : lien britannique (Gurkhas)
  KHM: { OCC: { p: 25, m: 0, c: 10, commerce: 0.7 }, CHN: { p: 40, m: 10, c: 15, commerce: 0.7 } }, // Cambodge : Hun Sen, aide chinoise
  GEO: { OCC: { p: 40, m: 10, c: 20, commerce: 0.6 }, CHN: { p: 8, m: 0, c: 1, commerce: 0.2 } }, // Géorgie : Chevardnadzé, orientation occidentale
  KGZ: { OCC: { p: 30, m: 5, c: 8, commerce: 0.5 }, CHN: { p: 25, m: 5, c: 3, commerce: 0.6 } }, // Kirghizistan : frontière chinoise, Groupe de Shanghai
  LAO: { OCC: { p: 10, m: 0, c: 3, commerce: 0.5 }, CHN: { p: 35, m: 5, c: 5, commerce: 0.6 } }, // Laos : régime communiste
  MDV: { OCC: { p: 40, m: 5, c: 25, commerce: 0.7 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Maldives : tourisme européen
  MNG: { OCC: { p: 40, m: 5, c: 15, commerce: 0.6 }, CHN: { p: 30, m: 0, c: 5, commerce: 0.8 } }, // Mongolie : « troisième voisin », dépendance commerciale envers la Chine
  MMR: { OCC: { p: 0, m: 0, c: 3, commerce: 1.0 }, CHN: { p: 55, m: 30, c: 5, commerce: 0.9 } }, // Birmanie : junte sous sanctions occidentales, armée équipée par la Chine
  NPL: { OCC: { p: 35, m: 5, c: 15, commerce: 0.6 }, CHN: { p: 25, m: 0, c: 3, commerce: 0.5 } }, // Népal : entre Inde et Chine, guérilla maoïste
  LKA: { OCC: { p: 40, m: 10, c: 25, commerce: 0.8 }, CHN: { p: 30, m: 5, c: 3, commerce: 0.5 } }, // Sri Lanka : guerre contre les Tigres tamouls, armes chinoises
  TJK: { OCC: { p: 20, m: 0, c: 5, commerce: 0.4 }, CHN: { p: 20, m: 5, c: 2, commerce: 0.5 } }, // Tadjikistan : sortie de guerre civile, sous protection russe
  TLS: { OCC: { p: 60, m: 40, c: 35, commerce: 1.0 }, CHN: { p: 10, m: 0, c: 3, commerce: 0.3 } }, // Timor oriental : administration de l'ONU, forces australiennes (INTERFET)
  TKM: { OCC: { p: 15, m: 0, c: 5, commerce: 0.5 }, CHN: { p: 15, m: 0, c: 2, commerce: 0.4 } }, // Turkménistan : neutralité permanente, régime fermé
  UZB: { OCC: { p: 30, m: 10, c: 8, commerce: 0.5 }, CHN: { p: 20, m: 5, c: 2, commerce: 0.5 } }, // Ouzbékistan : méfiant envers Moscou, avant la base américaine de 2001
  BHR: { OCC: { p: 65, m: 65, c: 30, commerce: 1.0 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.4 } }, // Bahreïn : profil « golfe »
  JOR: { OCC: { p: 65, m: 50, c: 35, commerce: 1.0 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Jordanie : allié des États-Unis, paix avec Israël
  KWT: { OCC: { p: 65, m: 65, c: 30, commerce: 1.0 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.4 } }, // Koweït : profil « golfe »
  LBN: { OCC: { p: 35, m: 5, c: 40, commerce: 0.8 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Liban : sous tutelle syrienne, francophonie
  OMN: { OCC: { p: 65, m: 65, c: 30, commerce: 1.0 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.4 } }, // Oman : profil « golfe »
  SYR: { OCC: { p: 5, m: 0, c: 10, commerce: 0.6 }, CHN: { p: 20, m: 5, c: 2, commerce: 0.4 } }, // Syrie : État soutien du terrorisme selon Washington
  YEM: { OCC: { p: 25, m: 10, c: 10, commerce: 0.7 }, CHN: { p: 15, m: 0, c: 2, commerce: 0.4 } }, // Yémen : attentat contre l'USS Cole en octobre 2000
  AGO: { OCC: { p: 35, m: 5, c: 20, commerce: 0.8 }, CHN: { p: 20, m: 0, c: 2, commerce: 0.5 } }, // Angola : guerre civile, pétrole vendu aux États-Unis
  BEN: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Bénin : profil « afrique_fr »
  BWA: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Botswana : profil « afrique_en »
  BFA: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Burkina Faso : profil « afrique_fr », reconnaît Taïwan en 2000
  BDI: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Burundi : profil « afrique_fr »
  CPV: { OCC: { p: 40, m: 5, c: 35, commerce: 0.7 }, CHN: { p: 10, m: 0, c: 1, commerce: 0.2 } }, // Cap-Vert : profil « afrique_pt »
  CMR: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Cameroun : profil « afrique_fr_base »
  CAF: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Centrafrique : profil « afrique_fr_base »
  TCD: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Tchad : profil « afrique_fr_base », reconnaît Taïwan en 2000
  COM: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Comores : profil « afrique_fr »
  COG: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Congo : profil « afrique_fr »
  CIV: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Côte d'Ivoire : profil « afrique_fr_base »
  DJI: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Djibouti : profil « afrique_fr_base »
  GNQ: { OCC: { p: 40, m: 5, c: 15, commerce: 1.0 }, CHN: { p: 15, m: 0, c: 1, commerce: 0.3 } }, // Guinée équatoriale : pétrole exploité par des compagnies américaines
  ERI: { OCC: { p: 25, m: 5, c: 10, commerce: 0.5 }, CHN: { p: 15, m: 0, c: 1, commerce: 0.3 } }, // Érythrée : guerre avec l'Éthiopie (1998-2000)
  SWZ: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Eswatini : profil « afrique_en », reconnaît Taïwan en 2000
  GAB: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Gabon : profil « afrique_fr_base »
  GMB: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Gambie : profil « afrique_en », reconnaît Taïwan en 2000
  GHA: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Ghana : profil « afrique_en »
  GIN: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Guinée : profil « afrique_fr »
  GNB: { OCC: { p: 40, m: 5, c: 35, commerce: 0.7 }, CHN: { p: 10, m: 0, c: 1, commerce: 0.2 } }, // Guinée-Bissau : profil « afrique_pt »
  LSO: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Lesotho : profil « afrique_en »
  LBR: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Liberia : profil « afrique_en », reconnaît Taïwan en 2000
  LBY: { OCC: { p: 0, m: 0, c: 5, commerce: 1.0 }, CHN: { p: 15, m: 0, c: 1, commerce: 0.3 } }, // Libye : Kadhafi, sanctions américaines
  MDG: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Madagascar : profil « afrique_fr »
  MWI: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Malawi : profil « afrique_en », reconnaît Taïwan en 2000
  MLI: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Mali : profil « afrique_fr »
  MRT: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Mauritanie : profil « afrique_fr »
  MUS: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Maurice : profil « afrique_en »
  MAR: { OCC: { p: 60, m: 30, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Maroc : partenaire de la France et des États-Unis
  MOZ: { OCC: { p: 40, m: 5, c: 25, commerce: 0.7 }, CHN: { p: 15, m: 0, c: 2, commerce: 0.3 } }, // Mozambique : bailleurs occidentaux
  NAM: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Namibie : profil « afrique_en »
  NER: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Niger : profil « afrique_fr »
  RWA: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Rwanda : profil « afrique_fr »
  STP: { OCC: { p: 40, m: 5, c: 35, commerce: 0.7 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Sao Tomé-et-Principe : profil « afrique_pt », reconnaît Taïwan en 2000
  SEN: { OCC: { p: 55, m: 45, c: 55, commerce: 0.9 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Sénégal : profil « afrique_fr_base », reconnaît Taïwan en 2000
  SYC: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Seychelles : profil « afrique_en »
  SLE: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Sierra Leone : profil « afrique_en »
  SOM: { OCC: { p: 15, m: 0, c: 10, commerce: 0.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.1 } }, // Somalie : État effondré
  SSD: { OCC: { p: 40, m: 5, c: 15, commerce: 0.5 }, CHN: { p: 10, m: 0, c: 1, commerce: 0.2 } }, // Soudan du Sud : rébellion du SPLM soutenue par Washington, partie du Soudan jusqu'en 2011
  SDN: { OCC: { p: 0, m: 0, c: 3, commerce: 1.0 }, CHN: { p: 45, m: 15, c: 2, commerce: 0.8 } }, // Soudan : sanctions américaines (1997), pétrole exploité par la CNPC
  TZA: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Tanzanie : profil « afrique_en »
  TGO: { OCC: { p: 45, m: 15, c: 45, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Togo : profil « afrique_fr »
  TUN: { OCC: { p: 55, m: 25, c: 50, commerce: 0.9 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Tunisie : Ben Ali, proche de la France
  UGA: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Ouganda : profil « afrique_en »
  ZMB: { OCC: { p: 45, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 2, commerce: 0.3 } }, // Zambie : profil « afrique_en »
  ZWE: { OCC: { p: 20, m: 0, c: 30, commerce: 0.7 }, CHN: { p: 25, m: 5, c: 2, commerce: 0.4 } }, // Zimbabwe : réforme agraire, rupture avec Londres
  ATG: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Antigua-et-Barbuda : profil « caraibes »
  BHS: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Bahamas : profil « caraibes »
  BRB: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Barbade : profil « caraibes »
  BLZ: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Belize : profil « amerique_centrale », reconnaît Taïwan en 2000
  BOL: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Bolivie : profil « amerique_latine »
  CRI: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Costa Rica : profil « amerique_centrale », reconnaît Taïwan en 2000
  DMA: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Dominique : profil « caraibes », reconnaît Taïwan en 2000
  DOM: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // République dominicaine : profil « caraibes », reconnaît Taïwan en 2000
  ECU: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Équateur : profil « amerique_latine »
  SLV: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Salvador : profil « amerique_centrale », reconnaît Taïwan en 2000
  GRD: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Grenade : profil « caraibes », reconnaît Taïwan en 2000
  GTM: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Guatemala : profil « amerique_centrale », reconnaît Taïwan en 2000
  GUY: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Guyana : profil « amerique_latine »
  HTI: { OCC: { p: 45, m: 25, c: 40, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Haïti : après l'intervention américaine et la mission de l'ONU, reconnaît Taïwan en 2000
  HND: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Honduras : profil « amerique_centrale », reconnaît Taïwan en 2000
  JAM: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Jamaïque : profil « caraibes »
  NIC: { OCC: { p: 60, m: 20, c: 55, commerce: 1.3 }, CHN: { p: 3, m: 0, c: 1, commerce: 0.2 } }, // Nicaragua : profil « amerique_centrale », reconnaît Taïwan en 2000
  PRY: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Paraguay : profil « amerique_latine », reconnaît Taïwan en 2000
  PER: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Pérou : profil « amerique_latine »
  KNA: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Saint-Christophe-et-Niévès : profil « caraibes », reconnaît Taïwan en 2000
  LCA: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Sainte-Lucie : profil « caraibes »
  VCT: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Saint-Vincent-et-les-Grenadines : profil « caraibes », reconnaît Taïwan en 2000
  SUR: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Suriname : profil « amerique_latine »
  TTO: { OCC: { p: 60, m: 20, c: 60, commerce: 1.2 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.3 } }, // Trinité-et-Tobago : profil « caraibes »
  URY: { OCC: { p: 50, m: 15, c: 50, commerce: 1.0 }, CHN: { p: 6, m: 0, c: 2, commerce: 0.3 } }, // Uruguay : profil « amerique_latine »
  FJI: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 12, m: 0, c: 3, commerce: 0.3 } }, // Fidji : coup d'État de mai 2000
  KIR: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Kiribati : profil « pacifique »
  MHL: { OCC: { p: 80, m: 70, c: 60, commerce: 1.5 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Îles Marshall : profil « compact », reconnaît Taïwan en 2000
  FSM: { OCC: { p: 80, m: 70, c: 60, commerce: 1.5 }, CHN: { p: 8, m: 0, c: 2, commerce: 0.2 } }, // Micronésie : profil « compact »
  NRU: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Nauru : profil « pacifique », reconnaît Taïwan en 2000
  NZL: { OCC: { p: 70, m: 35, c: 65, commerce: 0.9 }, CHN: { p: 12, m: 0, c: 5, commerce: 0.6 } }, // Nouvelle-Zélande : ANZUS suspendu avec Washington, proche de l'Australie
  PLW: { OCC: { p: 80, m: 70, c: 60, commerce: 1.5 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Palaos : profil « compact », reconnaît Taïwan en 2000
  PNG: { OCC: { p: 55, m: 20, c: 40, commerce: 0.9 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Papouasie-Nouvelle-Guinée : sous l'influence de l'Australie
  WSM: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Samoa : profil « pacifique »
  SLB: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Îles Salomon : profil « pacifique », reconnaît Taïwan en 2000
  TON: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Tonga : profil « pacifique »
  TUV: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 3, m: 0, c: 2, commerce: 0.2 } }, // Tuvalu : profil « pacifique », reconnaît Taïwan en 2000
  VUT: { OCC: { p: 50, m: 10, c: 40, commerce: 0.8 }, CHN: { p: 10, m: 0, c: 2, commerce: 0.3 } }, // Vanuatu : profil « pacifique »
};
