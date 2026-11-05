// Catalogue des 22 duels : chaque situation de jeu a son mini-jeu rapide (30 à 90 secondes), inspiré d'un classique et remixé.
// Ce fichier ne contient que les métadonnées : le moteur des plans s'en sert sans charger la logique des jeux.
export type IdDuel =
  | "jaipur" | "longhorn" | "sept" | "quarto" | "puissance4" | "echecs" | "othello" | "coup" | "skull" | "mastermind" | "simon"
  | "korsar" | "lostcities" | "santorini" | "onitama" | "go" | "bataille" | "memoire44" | "streetfighter" | "schotten" | "stratego" | "perudo";

// Le jeu d'origine n'est jamais affiché (choix de l'utilisateur, 2026-10-29) : chaque duel est présenté par sa situation.
export interface InfoDuel { id: IdDuel; nom: string; situation: string; principe: string }

export const DUELS: Record<IdDuel, InfoDuel> = {
  jaipur: { id: "jaipur", nom: "Marché des contrats", situation: "Commerce",
    principe: "Prends un contrat au marché ou vends une série : vendre tôt rapporte plus, attendre fait des séries plus grosses." },
  longhorn: { id: "longhorn", nom: "Tournée des capitales", situation: "Ingérence dans une région",
    principe: "Ton agent prend tous les jetons d'une couleur dans un pays ; leur nombre fixe la longueur de son prochain saut." },
  sept: { id: "sept", nom: "Pyramide d'influence", situation: "Expansion régionale, rayonnement",
    principe: "Prends une carte libre de la pyramide : elle en découvre d'autres pour l'adversaire. Économie, culture ou suprématie militaire." },
  quarto: { id: "quarto", nom: "Table de négociation", situation: "Négociation d'un accord",
    principe: "Tu choisis la concession que l'autre doit placer. Aligner 4 concessions qui partagent un trait impose tes termes." },
  puissance4: { id: "puissance4", nom: "Soir d'élection", situation: "Élection",
    principe: "Chaque colonne est un électorat. Aligne 4 jetons de campagne pour faire basculer le scrutin." },
  echecs: { id: "echecs", nom: "Nuit du putsch", situation: "Coup d'État",
    principe: "Plateau 5 × 5 dans la capitale : prends le palais en 8 coups face aux loyalistes." },
  othello: { id: "othello", nom: "Place de la révolution", situation: "Révolution de couleur",
    principe: "Un rassemblement retourne les quartiers encadrés. La majorité des quartiers décide du sort du régime." },
  coup: { id: "coup", nom: "Intrigue de palais", situation: "Succession, intrigue",
    principe: "Annonce un rôle pour agir, que tu l'aies ou pas. Le menteur démasqué perd une carte." },
  skull: { id: "skull", nom: "Guerre de l'information", situation: "Désinformation",
    principe: "Parie sur le nombre d'informations vraies que tu peux révéler sans tomber sur un faux." },
  mastermind: { id: "mastermind", nom: "La taupe", situation: "Espionnage",
    principe: "Trouve la combinaison secrète (lieu, contact, heure, moyen) en 6 essais." },
  simon: { id: "simon", nom: "Intrusion", situation: "Cyberattaque",
    principe: "Mémorise puis rejoue des séquences de nœuds de plus en plus longues." },
  korsar: { id: "korsar", nom: "Corsaires du commerce", situation: "Sanctions, guerre commerciale",
    principe: "Attaque les flux commerciaux avec des sanctions d'une couleur ; l'autre surenchérit ou appelle un amiral." },
  lostcities: { id: "lostcities", nom: "Course aux laboratoires", situation: "Course technologique",
    principe: "Lance des pistes de recherche en ordre croissant : une piste ouverte ne paie que si elle va assez loin." },
  santorini: { id: "santorini", nom: "Grands chantiers", situation: "Infrastructures",
    principe: "Construis et grimpe : ton ingénieur doit inaugurer un chantier de niveau 3. Le veto adverse ferme un chantier." },
  onitama: { id: "onitama", nom: "Manœuvres navales", situation: "Présence militaire, détroit",
    principe: "La carte de mouvement que tu joues passe à l'adversaire. Atteins son port ou isole son vaisseau amiral." },
  go: { id: "go", nom: "Encerclement maritime", situation: "Blocus",
    principe: "Encercle les zones de passage sur un goban 5 × 5. Le plus de territoire contrôlé l'emporte." },
  bataille: { id: "bataille", nom: "Chasse sous-marine", situation: "Guerre sous-marine",
    principe: "Le sonar donne la distance du sous-marin le plus proche. Coule l'escadre adverse avant elle." },
  memoire44: { id: "memoire44", nom: "Front en trois secteurs", situation: "Guerre sur un front",
    principe: "Tes cartes d'ordre activent un secteur ; les dés à symboles règlent les combats. Prends 3 objectifs." },
  streetfighter: { id: "streetfighter", nom: "Frappe éclair", situation: "Frappe, duel aérien",
    principe: "Choisis en secret ta manœuvre : chacune en bat deux et perd contre deux. Enchaîne pour des combos." },
  schotten: { id: "schotten", nom: "Frontière disputée", situation: "Frontière",
    principe: "Pose 3 cartes de ton côté d'une borne : la meilleure combinaison la prend. 5 bornes, ou 3 voisines, gagnent." },
  stratego: { id: "stratego", nom: "Guerre de l'ombre", situation: "Guerre par procuration",
    principe: "Tes unités sont cachées ; chaque attaque révèle les deux pièces. Capture le QG ennemi." },
  perudo: { id: "perudo", nom: "Bord du gouffre", situation: "Crise nucléaire",
    principe: "Enchéris sur le total des dés cachés, ou accuse l'autre de bluffer. Qui se trompe recule." },
};
export const LISTE_DUELS = Object.keys(DUELS) as IdDuel[];
