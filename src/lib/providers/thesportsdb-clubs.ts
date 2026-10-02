/**
 * Ligue 2 et Ligue 3 via TheSportsDB (gratuit) : matchs à venir et classements.
 * Ces championnats ne font pas partie de l'offre gratuite de football-data.org.
 */
import { TSDB_CLUB_COMPETITIONS, TSDB_CLUB_WINDOW_DAYS, type TsdbClubCompetition } from "@/config/competitions";
import { cityForStadium } from "@/config/lieux";
import { addDays } from "@/lib/dates";
import { kickoffOf, resolveLeagueId, tsdb, type TsdbEvent } from "@/lib/providers/thesportsdb";
import type { FetchResult, RawMatch, RecentResult, ResultLetter, StandingTable } from "@/lib/types";

const FRANCE = ["France"];

const season = (now = new Date()) => {
  const y = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? y : y - 1;
  return `${start}-${start + 1}`;
};

/* ---------------- Matchs à venir ---------------- */

async function upcomingFor(comp: TsdbClubCompetition, now: Date): Promise<RawMatch[]> {
  const leagueId = await resolveLeagueId(comp, FRANCE);
  if (!leagueId) throw new Error("championnat introuvable sur TheSportsDB.");

  const events = new Map<string, TsdbEvent>();
  const next = await tsdb<{ events?: TsdbEvent[] | null }>(`eventsnextleague.php?id=${leagueId}`);
  for (const e of next?.events ?? []) events.set(e.idEvent, e);

  // Complète jour par jour (la clé gratuite ne renvoie qu'un échantillon)
  for (let i = 0; i < TSDB_CLUB_WINDOW_DAYS; i++) {
    const day = addDays(now, i).toISOString().slice(0, 10);
    const data = await tsdb<{ events?: TsdbEvent[] | null }>(`eventsday.php?d=${day}&l=${leagueId}`);
    for (const e of data?.events ?? []) events.set(e.idEvent, e);
  }

  const out: RawMatch[] = [];
  for (const e of events.values()) {
    const k = kickoffOf(e);
    if (!k || new Date(k.iso).getTime() <= now.getTime()) continue;
    if (e.strStatus && !/not started|^ns$|time to be defined|tbd|postponed/i.test(e.strStatus)) continue;
    out.push({
      id: `tsdb-${e.idEvent}`,
      section: "clubs",
      competition: comp.id,
      competitionName: comp.name,
      stageLabel: e.intRound ? `Journée ${e.intRound}` : null,
      stage: null,
      kickoff: k.iso,
      timeConfirmed: k.confirmed,
      home: { name: e.strHomeTeam ?? "À déterminer", logo: e.strHomeTeamBadge ?? null },
      away: { name: e.strAwayTeam ?? "À déterminer", logo: e.strAwayTeamBadge ?? null },
      venue: { stadium: e.strVenue || null, city: e.strCity || cityForStadium(e.strVenue ?? null) },
    });
  }
  return out;
}

export async function fetchTsdbClubMatches(): Promise<FetchResult> {
  const now = new Date();
  const matches: RawMatch[] = [];
  const warnings: string[] = [];
  for (const comp of TSDB_CLUB_COMPETITIONS) {
    try {
      matches.push(...(await upcomingFor(comp, now)));
    } catch (e) {
      warnings.push(`${comp.name} : ${(e as Error).message}`);
    }
  }
  return { updatedAt: now.toISOString(), matches, warnings };
}

/* ---------------- Classements ---------------- */

interface TsdbTableRow {
  intRank?: string;
  strTeam?: string;
  strBadge?: string | null;
  strTeamBadge?: string | null;
  intPlayed?: string;
  intWin?: string;
  intDraw?: string;
  intLoss?: string;
  intGoalsFor?: string;
  intGoalsAgainst?: string;
  intGoalDifference?: string;
  intPoints?: string;
  strForm?: string | null;
}

const n = (v?: string | null) => Number(v ?? 0) || 0;
const FORM: Record<string, ResultLetter> = { W: "V", D: "N", L: "D" };

async function tableFor(comp: TsdbClubCompetition): Promise<StandingTable> {
  const leagueId = await resolveLeagueId(comp, FRANCE);
  if (!leagueId) throw new Error("championnat introuvable sur TheSportsDB.");

  const [table, past] = await Promise.all([
    tsdb<{ table?: TsdbTableRow[] | null }>(`lookuptable.php?l=${leagueId}&s=${season()}`),
    tsdb<{ events?: (TsdbEvent & { intHomeScore?: string | null; intAwayScore?: string | null })[] | null }>(
      `eventspastleague.php?id=${leagueId}`,
    ).catch(() => null),
  ]);
  const rows = table?.table ?? [];
  if (rows.length === 0) throw new Error("classement pas encore disponible.");

  // Derniers résultats connus (la clé gratuite n'en renvoie qu'une partie)
  const recent = new Map<string, RecentResult[]>();
  const pastEvents = [...(past?.events ?? [])].sort((a, b) => (b.dateEvent ?? "").localeCompare(a.dateEvent ?? ""));
  for (const e of pastEvents) {
    const h = e.intHomeScore;
    const a = e.intAwayScore;
    if (h == null || a == null || h === "" || a === "") continue;
    const k = kickoffOf(e);
    for (const side of ["home", "away"] as const) {
      const team = side === "home" ? e.strHomeTeam : e.strAwayTeam;
      const opp = side === "home" ? e.strAwayTeam : e.strHomeTeam;
      if (!team) continue;
      const gf = n(side === "home" ? h : a);
      const ga = n(side === "home" ? a : h);
      const list = recent.get(team) ?? [];
      if (list.length >= 5) continue;
      list.push({
        date: k?.iso ?? `${e.dateEvent}T12:00:00Z`,
        opponent: { name: opp ?? "?", logo: (side === "home" ? e.strAwayTeamBadge : e.strHomeTeamBadge) ?? null },
        home: side === "home",
        goalsFor: gf,
        goalsAgainst: ga,
        result: gf > ga ? "V" : gf < ga ? "D" : "N",
        competition: comp.id,
      });
      recent.set(team, list);
    }
  }

  return {
    competition: comp.id,
    name: comp.name,
    rows: rows.map((r, i) => {
      const name = r.strTeam ?? "?";
      const formLetters = (r.strForm ?? "").toUpperCase().split("").map((c) => FORM[c]).filter(Boolean);
      const known = recent.get(name) ?? [];
      return {
        position: n(r.intRank) || i + 1,
        team: { name, logo: r.strBadge ?? r.strTeamBadge ?? null },
        played: n(r.intPlayed),
        won: n(r.intWin),
        draw: n(r.intDraw),
        lost: n(r.intLoss),
        goalsFor: n(r.intGoalsFor),
        goalsAgainst: n(r.intGoalsAgainst),
        goalDifference: n(r.intGoalDifference),
        points: n(r.intPoints),
        // TheSportsDB donne la forme du plus ancien au plus récent : on l'inverse
        form: formLetters.length ? formLetters.reverse().slice(0, 5) : known.map((x) => x.result),
        recent: known,
        nextMatch: null,
      };
    }),
  };
}

export async function fetchTsdbClubTables(): Promise<{ tables: StandingTable[]; warnings: string[] }> {
  const tables: StandingTable[] = [];
  const warnings: string[] = [];
  for (const comp of TSDB_CLUB_COMPETITIONS) {
    try {
      tables.push(await tableFor(comp));
    } catch (e) {
      warnings.push(`${comp.name} : ${(e as Error).message}`);
    }
  }
  return { tables, warnings };
}
