/**
 * Récupération des matchs internationaux chez ESPN (sans clé).
 * Ce module ne dépend pas de Next.js : il tourne sur le serveur Vercel
 * ou directement sur l'iPhone si ESPN bloque les serveurs.
 */
import { INTERNATIONAL_COMPETITIONS, INTERNATIONAL_WINDOW_DAYS, type InternationalCompetition } from "@/config/competitions";
import { addDays } from "@/lib/dates";
import { isNotableNation, toFrenchNation } from "@/lib/nations";
import type { FetchResult, RawMatch } from "@/lib/types";

export type JsonGetter = (url: string) => Promise<{ status: number; data: unknown }>;

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

interface EspnCompetitor {
  homeAway: "home" | "away";
  team: { displayName?: string; name?: string; logo?: string };
}
interface EspnEvent {
  id: string;
  date: string;
  timeValid?: boolean;
  status?: { type?: { state?: string } };
  competitions?: {
    timeValid?: boolean;
    venue?: { fullName?: string; address?: { city?: string } };
    competitors?: EspnCompetitor[];
    status?: { type?: { state?: string } };
  }[];
}

const espnDay = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");

/** null = ESPN refuse cette période (400) ; erreur levée pour tout autre refus. */
async function fetchRange(get: JsonGetter, slug: string, from: Date, to: Date): Promise<EspnEvent[] | null> {
  const { status, data } = await get(`${BASE}/${slug}/scoreboard?dates=${espnDay(from)}-${espnDay(to)}`);
  if (status === 400) return null;
  if (status === 403) throw new Error("ESPN : accès refusé (403).");
  if (status < 200 || status >= 300) throw new Error(`ESPN : erreur ${status}.`);
  return ((data as { events?: EspnEvent[] })?.events) ?? [];
}

/** Essaie toute la période, puis des tranches de 28 jours, puis des semaines. */
async function fetchEvents(get: JsonGetter, slug: string, from: Date, to: Date): Promise<EspnEvent[]> {
  const whole = await fetchRange(get, slug, from, to);
  if (whole) return whole;

  const events = new Map<string, EspnEvent>();
  let attempts = 0;
  let refused = 0;
  for (let start = from; start < to; start = addDays(start, 28)) {
    const end = new Date(Math.min(addDays(start, 27).getTime(), to.getTime()));
    attempts++;
    let batch = await fetchRange(get, slug, start, end);
    if (batch === null) {
      refused++;
      batch = [];
      for (let w = start; w <= end; w = addDays(w, 7)) {
        const wEnd = new Date(Math.min(addDays(w, 6).getTime(), end.getTime()));
        attempts++;
        const week = await fetchRange(get, slug, w, wEnd);
        if (week === null) refused++;
        else batch.push(...week);
      }
    }
    for (const e of batch) events.set(e.id, e);
  }
  if (events.size === 0 && refused === attempts) throw new Error("ESPN : compétition introuvable (400).");
  return [...events.values()];
}

function toRaw(e: EspnEvent, comp: InternationalCompetition): RawMatch | null {
  const c = e.competitions?.[0];
  const state = c?.status?.type?.state ?? e.status?.type?.state;
  if (state && state !== "pre") return null;
  if (new Date(e.date).getTime() <= Date.now()) return null;

  const home = c?.competitors?.find((x) => x.homeAway === "home")?.team;
  const away = c?.competitors?.find((x) => x.homeAway === "away")?.team;
  if (!home || !away) return null;

  const homeName = home.displayName ?? home.name ?? "À déterminer";
  const awayName = away.displayName ?? away.name ?? "À déterminer";
  if (comp.id === "FRIENDLY" && !isNotableNation(homeName) && !isNotableNation(awayName)) return null;

  return {
    id: `espn-${e.id}`,
    section: "selections",
    competition: comp.id,
    competitionName: comp.name,
    stageLabel: null,
    stage: null,
    kickoff: new Date(e.date).toISOString(),
    timeConfirmed: (c?.timeValid ?? e.timeValid) !== false,
    home: { name: toFrenchNation(homeName), logo: home.logo ?? null },
    away: { name: toFrenchNation(awayName), logo: away.logo ?? null },
    venue: { stadium: c?.venue?.fullName ?? null, city: c?.venue?.address?.city ?? null },
  };
}

export async function loadInternationalMatches(get: JsonGetter): Promise<FetchResult> {
  const now = new Date();
  const to = addDays(now, INTERNATIONAL_WINDOW_DAYS);

  const results = await Promise.allSettled(
    INTERNATIONAL_COMPETITIONS.map(async (comp) =>
      (await fetchEvents(get, comp.espnSlug, now, to)).map((e) => toRaw(e, comp)).filter((m): m is RawMatch => m !== null),
    ),
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
  return { updatedAt: now.toISOString(), matches, warnings };
}
