/**
 * football-data.org — clubs (LDC, Ligue 1, Premier League, Liga)
 * Offre gratuite permanente : 12 compétitions, 10 requêtes / minute, pas de quota journalier.
 */
import { unstable_cache } from "next/cache";
import { CLUB_COMPETITIONS, CLUB_WINDOW_DAYS, type ClubCompetition } from "@/config/competitions";
import { cityForStadium } from "@/config/lieux";
import { addDays, isoDay } from "@/lib/dates";
import type { FetchResult, RawMatch } from "@/lib/types";

const BASE = "https://api.football-data.org/v4";

interface FdTeam { id: number | null; name: string | null; shortName: string | null; crest: string | null }
interface FdMatch {
  id: number;
  utcDate: string;
  status: string;
  stage: string | null;
  matchday: number | null;
  venue?: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
}

async function fd<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Clé football-data.org absente (FOOTBALL_DATA_TOKEN dans Vercel).");

  const res = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
  if (res.status === 429) throw new Error("football-data.org : limite par minute atteinte, nouvel essai au prochain rafraîchissement.");
  if (res.status === 401 || res.status === 403) throw new Error("football-data.org : clé refusée ou compétition hors offre gratuite.");
  if (!res.ok) throw new Error(`football-data.org : erreur ${res.status}.`);
  return (await res.json()) as T;
}

/** Stade de chaque équipe d'une compétition. Change rarement : cache 7 jours. */
function getTeamVenues(code: string) {
  return unstable_cache(
    async () => {
      const data = await fd<{ teams: { id: number; venue?: string | null }[] }>(`/competitions/${code}/teams`);
      const venues: Record<string, string> = {};
      for (const t of data.teams) if (t.venue) venues[String(t.id)] = t.venue;
      return venues;
    },
    ["fd-team-venues", code],
    { revalidate: 7 * 24 * 3600, tags: ["teams"] },
  )();
}

const STAGES: Record<string, string> = {
  LEAGUE_STAGE: "Phase de ligue",
  PLAYOFFS: "Barrages",
  LAST_16: "Huitièmes de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  FINAL: "Finale",
};

function stageLabel(m: FdMatch, comp: ClubCompetition) {
  if (comp.id === "CL") {
    const phase = (m.stage && STAGES[m.stage]) ?? null;
    if (m.stage === "LEAGUE_STAGE" && m.matchday) return `${phase}, journée ${m.matchday}`;
    return phase;
  }
  return m.matchday ? `Journée ${m.matchday}` : null;
}

const team = (t: FdTeam) => ({ name: t.shortName ?? t.name ?? "À déterminer", logo: t.crest ?? null });

function toRaw(m: FdMatch, comp: ClubCompetition, venues: Record<string, string>): RawMatch {
  const stadium = m.venue ?? (m.homeTeam.id != null ? venues[String(m.homeTeam.id)] : undefined) ?? null;
  return {
    id: `fd-${m.id}`,
    section: "clubs",
    competition: comp.id,
    competitionName: comp.name,
    stageLabel: stageLabel(m, comp),
    stage: m.stage,
    kickoff: m.utcDate,
    timeConfirmed: m.status === "TIMED",
    home: team(m.homeTeam),
    away: team(m.awayTeam),
    venue: { stadium, city: cityForStadium(stadium) },
  };
}

export async function fetchClubMatches(): Promise<FetchResult> {
  const now = new Date();
  const from = isoDay(now);
  const to = isoDay(addDays(now, CLUB_WINDOW_DAYS));

  // 4 compétitions = 4 requêtes (+ 4 pour les stades une fois par semaine) : sous la limite de 10/min.
  const results = await Promise.allSettled(
    CLUB_COMPETITIONS.map(async (comp) => {
      const [data, venues] = await Promise.all([
        fd<{ matches: FdMatch[] }>(`/competitions/${comp.footballDataCode}/matches?dateFrom=${from}&dateTo=${to}`),
        getTeamVenues(comp.footballDataCode).catch(() => ({}) as Record<string, string>),
      ]);
      return data.matches
        .filter((m) => (m.status === "SCHEDULED" || m.status === "TIMED") && new Date(m.utcDate) > now)
        .map((m) => toRaw(m, comp, venues));
    }),
  );

  const matches: RawMatch[] = [];
  const warnings: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") matches.push(...r.value);
    else warnings.push(`${CLUB_COMPETITIONS[i].name} : ${(r.reason as Error).message}`);
  });

  // Tout a échoué : on lève une erreur pour ne PAS mettre ce résultat vide en cache.
  if (matches.length === 0 && warnings.length === CLUB_COMPETITIONS.length) {
    throw new Error(warnings[0]);
  }

  return { updatedAt: now.toISOString(), matches, warnings };
}
