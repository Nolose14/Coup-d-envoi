/**
 * API-Football (api-sports.io) — sélections nationales
 * Offre gratuite permanente : 100 requêtes / jour, toutes les compétitions,
 * mais les saisons accessibles sont limitées (voir le guide).
 * Avantage : fournit le stade ET la ville.
 */
import { unstable_cache } from "next/cache";
import { INTERNATIONAL_COMPETITIONS, INTERNATIONAL_WINDOW_DAYS, type InternationalCompetition } from "@/config/competitions";
import { addDays, isoDay } from "@/lib/dates";
import { isNotableNation, toFrenchNation } from "@/lib/nations";
import type { FetchResult, RawMatch } from "@/lib/types";

const BASE = "https://v3.football.api-sports.io";

interface AfFixture {
  fixture: { id: number; date: string; venue: { name: string | null; city: string | null }; status: { short: string } };
  league: { round: string | null };
  teams: { home: { name: string; logo: string | null }; away: { name: string; logo: string | null } };
}

async function af<T>(path: string): Promise<T> {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error("Clé API-Football absente (API_FOOTBALL_KEY dans Vercel).");

  const res = await fetch(`${BASE}${path}`, { headers: { "x-apisports-key": key }, cache: "no-store" });
  if (!res.ok) throw new Error(`API-Football : erreur ${res.status}.`);
  const json = await res.json();

  // API-Football répond 200 même en cas d'erreur : le détail est dans "errors".
  const errors = json.errors;
  const hasErrors = errors && (Array.isArray(errors) ? errors.length > 0 : Object.keys(errors).length > 0);
  if (hasErrors) throw new Error(`API-Football : ${Object.values(errors).join(" ")}`);
  return json as T;
}

/** Saison en cours d'une compétition (ex. 2026 pour la Ligue des nations 2026-27). Cache 7 jours. */
function getCurrentSeason(leagueId: number) {
  return unstable_cache(
    async () => {
      const data = await af<{ response: { seasons: { year: number; current: boolean }[] }[] }>(
        `/leagues?id=${leagueId}&current=true`,
      );
      const seasons = data.response[0]?.seasons ?? [];
      return (seasons.find((s) => s.current) ?? seasons[0])?.year ?? null;
    },
    ["af-season", String(leagueId)],
    { revalidate: 7 * 24 * 3600, tags: ["seasons"] },
  )();
}

function roundLabel(round: string | null) {
  if (!round) return null;
  return round
    .replace(/^League ([A-D]) - (\d+)$/, "Ligue $1, journée $2")
    .replace(/^Group Stage - (\d+)$/, "Journée $1")
    .replace(/^Group ([A-Z]) - (\d+)$/, "Groupe $1, journée $2")
    .replace(/^Friendlies.*$/, "")
    .trim() || null;
}

function toRaw(f: AfFixture, comp: InternationalCompetition): RawMatch {
  return {
    id: `af-${f.fixture.id}`,
    section: "selections",
    competition: comp.id,
    competitionName: comp.name,
    stageLabel: roundLabel(f.league.round),
    stage: f.league.round,
    kickoff: new Date(f.fixture.date).toISOString(),
    timeConfirmed: f.fixture.status.short !== "TBD",
    home: { name: toFrenchNation(f.teams.home.name), logo: f.teams.home.logo },
    away: { name: toFrenchNation(f.teams.away.name), logo: f.teams.away.logo },
    venue: { stadium: f.fixture.venue.name, city: f.fixture.venue.city },
  };
}

export async function fetchInternationalMatches(): Promise<FetchResult> {
  const now = new Date();
  const from = isoDay(now);
  const to = isoDay(addDays(now, INTERNATIONAL_WINDOW_DAYS));

  // 4 requêtes par rafraîchissement (toutes les 6 h) + 4 par semaine pour les saisons ≈ 17 / jour sur 100.
  const results = await Promise.allSettled(
    INTERNATIONAL_COMPETITIONS.map(async (comp) => {
      const season = await getCurrentSeason(comp.apiFootballLeagueId);
      if (!season) return [];
      const data = await af<{ response: AfFixture[] }>(
        `/fixtures?league=${comp.apiFootballLeagueId}&season=${season}&from=${from}&to=${to}&timezone=UTC`,
      );
      return data.response
        .filter((f) => ["NS", "TBD"].includes(f.fixture.status.short) && new Date(f.fixture.date) > now)
        .filter((f) => comp.id !== "FRIENDLY" || isNotableNation(f.teams.home.name) || isNotableNation(f.teams.away.name))
        .map((f) => toRaw(f, comp));
    }),
  );

  const matches: RawMatch[] = [];
  const warnings: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") matches.push(...r.value);
    else warnings.push(`${INTERNATIONAL_COMPETITIONS[i].name} : ${(r.reason as Error).message}`);
  });

  if (matches.length === 0 && warnings.length === INTERNATIONAL_COMPETITIONS.length) {
    throw new Error(warnings[0]);
  }

  return { updatedAt: now.toISOString(), matches, warnings: [...new Set(warnings)] };
}
