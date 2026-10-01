export type Section = "clubs" | "selections";

export type CompetitionId =
  | "CL" | "FL1" | "PL" | "PD"           // clubs
  | "NL" | "WCQ" | "ECQ" | "FRIENDLY";   // sélections

export interface TeamInfo {
  name: string;
  logo: string | null;
}

export interface Venue {
  stadium: string | null;
  city: string | null;
}

export interface Broadcaster {
  name: string;
  url?: string;
}

/** Match normalisé, quel que soit le fournisseur de données. */
export interface RawMatch {
  id: string;                 // préfixé par le fournisseur : "fd-…" ou "af-…"
  section: Section;
  competition: CompetitionId;
  competitionName: string;
  stageLabel: string | null;
  stage: string | null;       // code brut de la phase (ex. "FINAL")
  kickoff: string;            // ISO 8601 UTC
  timeConfirmed: boolean;     // false = horaire encore provisoire
  home: TeamInfo;
  away: TeamInfo;
  venue: Venue;
}

export interface MatchItem extends RawMatch {
  broadcasters: Broadcaster[];
}

export interface FetchResult {
  updatedAt: string;
  matches: RawMatch[];
  warnings: string[];
}

export interface MatchesPayload {
  section: Section;
  updatedAt: string;
  matches: MatchItem[];
  warnings: string[];
}
