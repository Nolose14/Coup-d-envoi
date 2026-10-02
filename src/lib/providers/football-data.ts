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

export interface FdTeam { id: number | null; name: string | null; shortName: string | null; crest: string | null }
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

/**
 * File d'attente : un appel toutes les 6,5 s au maximum (≈ 9 par minute),
 * pour ne jamais dépasser la limite gratuite de 10 appels/minute,
 * même quand matchs et classements se mettent à jour en même temps.
 */
let queue: Promise<unknown> = Promise.resolve();
let lastCall = 0;
function scheduled<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(async () => {
    const wait = lastCall + 6500 - Date.now();
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastCall = Date.now();
    return task();
  });
  queue = run.catch(() => undefined);
  return run;
}

export function fd<T>(path: string): Promise<T> {
  return scheduled(() => fdNow<T>(path));
}

async function fdNow<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) throw new Error("Clé football-data.org absente (FOOTBALL_DATA_TOKEN dans Vercel).");

  const res = await fetch(`${BASE}${path}`, { headers: { "X-Auth-Token": token }, cache: "no-store" });
  if (res.status === 429) throw new Error("football-data.org : limite par minute atteinte, nouvel essai au prochain rafraîchissement.");
  if (res.status === 401 || res.status === 403) throw new Error("football-data.org : clé refusée ou compétition hors offre gratuite.");
  if (!res.ok) throw new Error(`football-data.org : erreur ${res.status}.`);
  return (await res.json()) as T;
}

const COLOR_WORDS: [RegExp, string][] = [
  [/navy|dark blue/, "#0b2a5b"], [/sky|light blue|celeste/, "#5fb4e6"], [/royal blue|blue/, "#1f5aa6"],
  [/claret|burgundy|bordeaux|maroon|garnet/, "#7a1f3d"], [/red|scarlet/, "#d7263d"],
  [/yellow/, "#f6c700"], [/gold|amber/, "#c9a227"], [/orange/, "#f07f13"],
  [/dark green/, "#0f5c32"], [/green/, "#1b8a3c"], [/purple|violet/, "#5b2a86"],
  [/black/, "#151515"], [/white/, "#f2f2f2"], [/grey|gray|silver/, "#8a8f98"],
];

/** "Red / Navy Blue / White" → première couleur reconnue en hexadécimal. */
function colorFrom(clubColors?: string | null): string | null {
  for (const part of (clubColors ?? "").toLowerCase().split(/\/|,|-|&| and /)) {
    const hit = COLOR_WORDS.find(([re]) => re.test(part.trim()));
    if (hit) return hit[1];
  }
  return null;
}

interface TeamMeta { venue: string | null; color: string | null }

/** Stade et couleur de chaque équipe d'une compétition. Change rarement : cache 7 jours. */
function getTeamMeta(code: string) {
  return unstable_cache(
    async () => {
      const data = await fd<{ teams: { id: number; venue?: string | null; clubColors?: string | null }[] }>(
        `/competitions/${code}/teams`,
      );
      const meta: Record<string, TeamMeta> = {};
      for (const t of data.teams) meta[String(t.id)] = { venue: t.venue ?? null, color: colorFrom(t.clubColors) };
      return meta;
    },
    ["fd-team-meta", code],
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

const team = (t: FdTeam, meta: Record<string, TeamMeta>) => ({
  name: t.shortName ?? t.name ?? "À déterminer",
  logo: t.crest ?? null,
  color: t.id != null ? meta[String(t.id)]?.color ?? null : null,
});

function toRaw(m: FdMatch, comp: ClubCompetition, meta: Record<string, TeamMeta>): RawMatch {
  const stadium = m.venue ?? (m.homeTeam.id != null ? meta[String(m.homeTeam.id)]?.venue : undefined) ?? null;
  return {
    id: `fd-${m.id}`,
    section: "clubs",
    competition: comp.id,
    competitionName: comp.name,
    stageLabel: stageLabel(m, comp),
    stage: m.stage,
    kickoff: m.utcDate,
    timeConfirmed: m.status === "TIMED",
    home: team(m.homeTeam, meta),
    away: team(m.awayTeam, meta),
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
      const [data, meta] = await Promise.all([
        fd<{ matches: FdMatch[] }>(`/competitions/${comp.footballDataCode}/matches?dateFrom=${from}&dateTo=${to}`),
        getTeamMeta(comp.footballDataCode).catch(() => ({}) as Record<string, TeamMeta>),
      ]);
      return data.matches
        .filter((m) => (m.status === "SCHEDULED" || m.status === "TIMED") && new Date(m.utcDate) > now)
        .map((m) => toRaw(m, comp, meta));
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
