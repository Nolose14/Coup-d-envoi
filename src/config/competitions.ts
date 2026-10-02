import type { CompetitionId } from "@/lib/types";

export interface ClubCompetition {
  id: CompetitionId;
  name: string;
  short: string;
  footballDataCode: string; // code football-data.org
  color: string;            // pastille de couleur sur les cartes
}

export interface InternationalCompetition {
  id: CompetitionId;
  name: string;
  color: string;
  /** Nom de la compétition chez TheSportsDB (sert à la retrouver automatiquement). */
  tsdbName: RegExp;
  /** Identifiants TheSportsDB probables, vérifiés automatiquement avant usage. */
  tsdbIds: number[];
}

/** Nombre de jours affichés à l'avance. */
export const CLUB_WINDOW_DAYS = 30;
export const INTERNATIONAL_WINDOW_DAYS = 365;

export const CLUB_COMPETITIONS: ClubCompetition[] = [
  { id: "CL",  name: "Ligue des champions", short: "LDC",            footballDataCode: "CL",  color: "#8EA2FF" },
  { id: "FL1", name: "Ligue 1",             short: "Ligue 1",        footballDataCode: "FL1", color: "#5EE0C4" },
  { id: "PL",  name: "Premier League",      short: "Premier League", footballDataCode: "PL",  color: "#D29BFF" },
  { id: "PD",  name: "Liga",                short: "Liga",           footballDataCode: "PD",  color: "#FFB547" },
];

export const INTERNATIONAL_COMPETITIONS: InternationalCompetition[] = [
  { id: "NL",       name: "Ligue des nations",      color: "#8EA2FF", tsdbName: /nations league/i,                        tsdbIds: [4490] },
  { id: "WCQ",      name: "Qualifications Mondial", color: "#FF8A7A", tsdbName: /world cup.*(qualif|uefa)|qualif.*world/i, tsdbIds: [] },
  { id: "ECQ",      name: "Qualifications Euro",    color: "#5EE0C4", tsdbName: /(euro|european championship).*qualif/i,  tsdbIds: [] },
  { id: "FRIENDLY", name: "Match amical",           color: "#C7CBD6", tsdbName: /friendl/i,                               tsdbIds: [4562] },
];

export const COMPETITION_COLORS: Record<string, string> = Object.fromEntries(
  [...CLUB_COMPETITIONS, ...INTERNATIONAL_COMPETITIONS].map((c) => [c.id, c.color]),
);
