// Registre des duels jouables : identifiant → règles. L'interface s'en sert pour lancer un duel du moteur des plans.
import type { IdDuel } from "./catalogue";
import type { DefDuel } from "./moteur";
import { PUISSANCE4 } from "./puissance4";
import { LONGHORN } from "./longhorn";
import { MEMOIRE44 } from "./memoire44";
import { OTHELLO } from "./othello";
import { GO } from "./go";
import { BATAILLE } from "./bataille";
import { MASTERMIND } from "./mastermind";
import { SIMON } from "./simon";
import { JAIPUR } from "./jaipur";
import { KORSAR } from "./korsar";
import { LOSTCITIES } from "./lostcities";
import { SCHOTTEN } from "./schotten";
import { SEPT } from "./sept";
import { QUARTO } from "./quarto";
import { ECHECS } from "./echecs";
import { SANTORINI } from "./santorini";
import { ONITAMA } from "./onitama";
import { STREETFIGHTER } from "./streetfighter";
import { STRATEGO } from "./stratego";
import { COUP } from "./coup";
import { SKULL } from "./skull";
import { PERUDO } from "./perudo";

export const REGLES: Record<IdDuel, DefDuel<any>> = {
  puissance4: PUISSANCE4, longhorn: LONGHORN, memoire44: MEMOIRE44, othello: OTHELLO, go: GO, bataille: BATAILLE, mastermind: MASTERMIND, simon: SIMON,
  jaipur: JAIPUR, korsar: KORSAR, lostcities: LOSTCITIES, schotten: SCHOTTEN, sept: SEPT, quarto: QUARTO, echecs: ECHECS, santorini: SANTORINI,
  onitama: ONITAMA, streetfighter: STREETFIGHTER, stratego: STRATEGO, coup: COUP, skull: SKULL, perudo: PERUDO,
};
