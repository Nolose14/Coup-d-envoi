/**
 * Classements Ligue 1, Premier League, Liga et Ligue des champions
 * (football-data.org gratuit). Cache 3 h : 8 appels par mise à jour.
 */
import { unstable_cache } from "next/cache";
import { CLUB_COMPETITIONS } from "@/config/competitions";
import { addDays, isoDay } from "@/lib/dates";
import { getMatches } from "@/lib/matches";
import { fd, type FdTeam } from "@/lib/providers/football-data";
import { fetchTsdbClubTables } from "@/lib/providers/thesportsdb-clubs";
import type { CompetitionId, RecentResult, ResultLetter, StandingTable, StandingsPayload, TeamInfo } from "@/lib/types";

interface FdStandingRow {
  position: number;
  team: FdTeam;
  playedGames: number;
  form?: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}
interface FdFinished {
  utcDate: string;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

const teamInfo = (t: FdTeam): TeamInfo => ({ name: t.shortName ?? t.name ?? "?", logo: t.crest ?? null });
const formFromString = (s?: string | null): ResultLetter[] =>
  (s ?? "").split(",").map((x) => ({ W: "V", D: "N", L: "D" })[x.trim()] as ResultLetter).filter(Boolean).reverse();

async function buildTable(code: string, id: CompetitionId, name: string): Promise<StandingTable> {
  const today = new Date();
  const [standings, finished] = await Promise.all([
    fd<{ standings: { type: string; table: FdStandingRow[] }[] }>(`/competitions/${code}/standings`),
    fd<{ matches: FdFinished[] }>(
      `/competitions/${code}/matches?status=FINISHED&dateFrom=${isoDay(addDays(today, -150))}&dateTo=${isoDay(today)}`,
    ).catch(() => ({ matches: [] as FdFinished[] })),
  ]);

  // Derniers résultats par équipe, du plus récent au plus ancien
  const recentByTeam = new Map<number, RecentResult[]>();
  const sorted = [...finished.matches].sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  for (const m of sorted) {
    const h = m.score.fullTime.home;
    const a = m.score.fullTime.away;
    if (h == null || a == null) continue;
    for (const side of ["home", "away"] as const) {
      const team = side === "home" ? m.homeTeam : m.awayTeam;
      const opp = side === "home" ? m.awayTeam : m.homeTeam;
      if (team.id == null) continue;
      const gf = side === "home" ? h : a;
      const ga = side === "home" ? a : h;
      const list = recentByTeam.get(team.id) ?? [];
      if (list.length < 5) {
        list.push({
          date: m.utcDate,
          opponent: teamInfo(opp),
          home: side === "home",
          goalsFor: gf,
          goalsAgainst: ga,
          result: gf > ga ? "V" : gf < ga ? "D" : "N",
          competition: id,
        });
        recentByTeam.set(team.id, list);
      }
    }
  }

  const total = standings.standings.find((s) => s.type === "TOTAL") ?? standings.standings[0];
  return {
    competition: id,
    name,
    rows: (total?.table ?? []).map((r) => {
      const recent = r.team.id != null ? recentByTeam.get(r.team.id) ?? [] : [];
      return {
        position: r.position,
        team: teamInfo(r.team),
        played: r.playedGames,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        goalsFor: r.goalsFor,
        goalsAgainst: r.goalsAgainst,
        goalDifference: r.goalDifference,
        points: r.points,
        form: recent.length ? recent.map((x) => x.result) : formFromString(r.form).slice(0, 5),
        recent,
        nextMatch: null,
      };
    }),
  };
}

const getTables = unstable_cache(
  async () => {
    const results = await Promise.allSettled(
      CLUB_COMPETITIONS.map((c) => buildTable(c.footballDataCode, c.id, c.name)),
    );
    const tables: StandingTable[] = [];
    const warnings: string[] = [];
    results.forEach((r, i) => {
      if (r.status === "fulfilled") tables.push(r.value);
      else warnings.push(`${CLUB_COMPETITIONS[i].name} : ${(r.reason as Error).message}`);
    });
    if (tables.length === 0) throw new Error(warnings[0] ?? "Classements indisponibles.");
    return { updatedAt: new Date().toISOString(), tables, warnings };
  },
  ["standings-v1"],
  { revalidate: 3 * 3600, tags: ["standings"] },
);

const getTsdbTables = unstable_cache(fetchTsdbClubTables, ["standings-tsdb-v1"], {
  revalidate: 3 * 3600,
  tags: ["standings"],
});

export async function getStandings(): Promise<StandingsPayload> {
  const [main, extra] = await Promise.allSettled([getTables(), getTsdbTables()]);
  if (main.status === "rejected" && (extra.status === "rejected" || extra.value.tables.length === 0)) {
    throw main.reason;
  }
  const base = {
    updatedAt: main.status === "fulfilled" ? main.value.updatedAt : new Date().toISOString(),
    tables: [
      ...(main.status === "fulfilled" ? main.value.tables : []),
      ...(extra.status === "fulfilled" ? extra.value.tables : []),
    ],
    warnings: [
      ...(main.status === "fulfilled" ? main.value.warnings : [String((main.reason as Error).message)]),
      ...(extra.status === "fulfilled" ? extra.value.warnings : [`Ligue 2 / Ligue 3 : ${(extra.reason as Error).message}`]),
    ],
  };

  // Prochain match de chaque équipe (toutes compétitions), tiré du cache des matchs
  let upcoming: Awaited<ReturnType<typeof getMatches>>["matches"] = [];
  try {
    upcoming = (await getMatches("clubs")).matches;
  } catch { /* sans prochain match, le classement reste affiché */ }

  const nextFor = (name: string) =>
    upcoming.find((m) => m.home.name === name || m.away.name === name) ?? null;

  return {
    ...base,
    tables: base.tables.map((t) => ({
      ...t,
      rows: t.rows.map((r) => ({ ...r, nextMatch: nextFor(r.team.name) })),
    })),
  };
}
