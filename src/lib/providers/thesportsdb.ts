/**
 * TheSportsDB — sélections nationales (API gratuite et ouverte, clé publique).
 * La clé gratuite renvoie un échantillon : on le complète en scannant jour par
 * jour les fenêtres internationales repérées (± 3 jours autour des matchs connus).
 * Les fenêtres lointaines apparaissent à mesure qu'elles approchent. Il peut
 * rester des trous :
 * les matchs des Bleus sont garantis par la liste manuelle (matchs-selections.ts).
 */
import { unstable_cache } from "next/cache";
import { INTERNATIONAL_COMPETITIONS, INTERNATIONAL_WINDOW_DAYS, type InternationalCompetition } from "@/config/competitions";
import { cityForStadium } from "@/config/lieux";
import { addDays } from "@/lib/dates";
import { flagUrl, isNotableNation, toFrenchNation } from "@/lib/nations";
import type { RawMatch } from "@/lib/types";

const KEYS = [process.env.THESPORTSDB_KEY, "123", "3"].filter(Boolean) as string[];
const BASE = "https://www.thesportsdb.com/api/v1/json";

let lastCall = 0;
async function throttle() {
  const wait = lastCall + 2100 - Date.now(); // ~28 requêtes/minute maximum
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();
}

async function tsdb<T>(path: string): Promise<T | null> {
  let lastStatus = 0;
  for (const key of KEYS) {
    await throttle();
    const res = await fetch(`${BASE}/${key}/${path}`, { cache: "no-store", headers: { Accept: "application/json" } });
    lastStatus = res.status;
    if (res.ok) {
      const text = await res.text();
      return text ? (JSON.parse(text) as T) : null;
    }
    if (res.status === 429) throw new Error("TheSportsDB : trop de requêtes, nouvel essai plus tard.");
  }
  throw new Error(`TheSportsDB : erreur ${lastStatus}.`);
}

interface TsdbLeague { idLeague: string; strLeague: string; strSport?: string }
interface TsdbEvent {
  idEvent: string;
  strLeague?: string;
  strHomeTeam?: string;
  strAwayTeam?: string;
  strTimestamp?: string | null;
  dateEvent?: string | null;
  strTime?: string | null;
  strVenue?: string | null;
  strCity?: string | null;
  strHomeTeamBadge?: string | null;
  strAwayTeamBadge?: string | null;
  strStatus?: string | null;
}

/** Retrouve l'identifiant de la compétition (vérifié par son nom). Cache 7 jours. */
function resolveLeagueId(comp: InternationalCompetition) {
  return unstable_cache(
    async (): Promise<string | null> => {
      for (const id of comp.tsdbIds) {
        const data = await tsdb<{ leagues?: TsdbLeague[] | null }>(`lookupleague.php?id=${id}`);
        const league = data?.leagues?.[0];
        if (league && comp.tsdbName.test(league.strLeague)) return league.idLeague;
      }
      for (const area of ["World", "Europe", "International"]) {
        const data = await tsdb<Record<string, TsdbLeague[] | null>>(`search_all_leagues.php?c=${area}&s=Soccer`);
        const list = data?.countries ?? data?.countrys ?? data?.leagues ?? [];
        const found = (list ?? []).find((l) => comp.tsdbName.test(l.strLeague) && !/women|u2\d|u1\d/i.test(l.strLeague));
        if (found) return found.idLeague;
      }
      return null;
    },
    ["tsdb-league", comp.id],
    { revalidate: 7 * 24 * 3600, tags: ["seasons"] },
  )();
}

function kickoffOf(e: TsdbEvent): { iso: string; confirmed: boolean } | null {
  let raw = e.strTimestamp ?? (e.dateEvent ? `${e.dateEvent}T${e.strTime || "00:00:00"}` : null);
  if (!raw) return null;
  if (!/[zZ]|[+-]\d\d:?\d\d$/.test(raw)) raw += "Z"; // TheSportsDB donne l'heure en UTC
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  const time = (e.strTime ?? raw.slice(11, 19)) || "";
  return { iso: d.toISOString(), confirmed: !!time && !time.startsWith("00:00") };
}

function seasonsToTry(now: Date, comp: InternationalCompetition) {
  const y = now.getUTCFullYear();
  const start = now.getUTCMonth() >= 6 ? y : y - 1;
  return comp.id === "FRIENDLY" ? [`${y}`] : [`${start}-${start + 1}`];
}

/** Jours à scanner un par un : autour de chaque date de match déjà connue (± 3 jours). */
function daysAround(events: Iterable<TsdbEvent>, now: Date, limit: number, max: number) {
  const days = new Set<string>();
  const today = now.toISOString().slice(0, 10);
  const sorted = [...events].map((e) => e.dateEvent).filter((d): d is string => !!d && d >= today).sort();
  for (const d of sorted) {
    const base = new Date(`${d}T12:00:00Z`);
    for (let i = -3; i <= 3; i++) {
      const day = addDays(base, i);
      const key = day.toISOString().slice(0, 10);
      if (key >= today && day.getTime() <= limit) days.add(key);
    }
    if (days.size >= max) break;
  }
  return [...days].sort().slice(0, max);
}

export async function fetchTsdbInternational(): Promise<{ matches: RawMatch[]; warnings: string[] }> {
  const now = new Date();
  const limit = addDays(now, INTERNATIONAL_WINDOW_DAYS).getTime();
  const matches: RawMatch[] = [];
  const warnings: string[] = [];

  // Compétitions traitées l'une après l'autre pour rester sous 30 requêtes/minute
  for (const comp of INTERNATIONAL_COMPETITIONS) {
    try {
      const leagueId = await resolveLeagueId(comp);
      if (!leagueId) continue;

      const events = new Map<string, TsdbEvent>();
      const next = await tsdb<{ events?: TsdbEvent[] | null }>(`eventsnextleague.php?id=${leagueId}`);
      for (const e of next?.events ?? []) events.set(e.idEvent, e);
      for (const season of seasonsToTry(now, comp)) {
        const data = await tsdb<{ events?: TsdbEvent[] | null }>(`eventsseason.php?id=${leagueId}&s=${season}`);
        for (const e of data?.events ?? []) events.set(e.idEvent, e);
      }

      // La clé gratuite ne renvoie qu'un échantillon : on complète en interrogeant
      // chaque jour autour des dates de matchs repérées (fenêtres internationales).
      for (const day of daysAround(events.values(), now, limit, 14)) {
        const data = await tsdb<{ events?: TsdbEvent[] | null }>(`eventsday.php?d=${day}&l=${leagueId}`);
        for (const e of data?.events ?? []) events.set(e.idEvent, e);
      }

      for (const e of events.values()) {
        if (e.strLeague && !comp.tsdbName.test(e.strLeague)) continue;
        const k = kickoffOf(e);
        if (!k) continue;
        const t = new Date(k.iso).getTime();
        if (t <= now.getTime() || t > limit) continue;
        if (e.strStatus && !/not started|^ns$|time to be defined|tbd|postponed/i.test(e.strStatus)) continue;

        const homeEn = e.strHomeTeam ?? "À déterminer";
        const awayEn = e.strAwayTeam ?? "À déterminer";
        if (comp.id === "FRIENDLY" && !isNotableNation(homeEn) && !isNotableNation(awayEn)) continue;
        const home = toFrenchNation(homeEn);
        const away = toFrenchNation(awayEn);

        matches.push({
          id: `tsdb-${e.idEvent}`,
          section: "selections",
          competition: comp.id,
          competitionName: comp.name,
          stageLabel: null,
          stage: null,
          kickoff: k.iso,
          timeConfirmed: k.confirmed,
          home: { name: home, logo: e.strHomeTeamBadge || flagUrl(home) },
          away: { name: away, logo: e.strAwayTeamBadge || flagUrl(away) },
          venue: { stadium: e.strVenue || null, city: e.strCity || cityForStadium(e.strVenue ?? null) },
        });
      }
    } catch (err) {
      warnings.push(`${comp.name} : ${(err as Error).message}`);
    }
  }
  return { matches, warnings };
}
