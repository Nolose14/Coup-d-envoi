/**
 * ESPN — sélections nationales
 * Point d'accès JSON public utilisé par le site ESPN : gratuit, sans clé,
 * avec le stade ET la ville. Il n'est pas documenté officiellement :
 * s'il change un jour, seul ce fichier sera à adapter.
 */
import { INTERNATIONAL_COMPETITIONS, INTERNATIONAL_WINDOW_DAYS, type InternationalCompetition } from "@/config/competitions";
import { addDays } from "@/lib/dates";
import { isNotableNation, toFrenchNation } from "@/lib/nations";
import type { FetchResult, RawMatch } from "@/lib/types";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

interface EspnCompetitor {
  homeAway: "home" | "away";
  team: { displayName?: string; shortDisplayName?: string; name?: string; logo?: string };
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

/** Appel ESPN sur une période ; renvoie null si ESPN refuse la période (400). */
async function fetchRange(slug: string, from: Date, to: Date): Promise<EspnEvent[] | null> {
  const url = `${BASE}/${slug}/scoreboard?dates=${espnDay(from)}-${espnDay(to)}`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0 (CoupDEnvoi)" },
  });
  if (res.status === 400) return null;
  if (!res.ok) throw new Error(`ESPN : erreur ${res.status}.`);
  const data = (await res.json()) as { events?: EspnEvent[] };
  return data.events ?? [];
}

/**
 * ESPN limite la longueur des périodes demandées : on découpe la fenêtre en
 * tranches de 28 jours, et si une tranche est refusée, en semaines.
 */
async function fetchEvents(slug: string, from: Date, to: Date): Promise<EspnEvent[]> {
  const events = new Map<string, EspnEvent>();
  let refused = 0;
  let chunks = 0;

  for (let start = from; start < to; start = addDays(start, 28)) {
    const end = new Date(Math.min(addDays(start, 27).getTime(), to.getTime()));
    let batch = await fetchRange(slug, start, end);
    if (batch === null) {
      batch = [];
      for (let w = start; w <= end; w = addDays(w, 7)) {
        chunks++;
        const wEnd = new Date(Math.min(addDays(w, 6).getTime(), end.getTime()));
        const week = await fetchRange(slug, w, wEnd);
        if (week === null) refused++;
        else batch.push(...week);
      }
    } else {
      chunks++;
    }
    for (const e of batch) events.set(e.id, e);
  }

  if (chunks > 0 && refused === chunks) throw new Error("ESPN : compétition introuvable (erreur 400).");
  return [...events.values()];
}

async function fetchCompetition(comp: InternationalCompetition, from: Date, to: Date): Promise<RawMatch[]> {
  const events = await fetchEvents(comp.espnSlug, from, to);

  const now = Date.now();
  const matches: RawMatch[] = [];

  for (const e of events) {
    const c = e.competitions?.[0];
    const state = c?.status?.type?.state ?? e.status?.type?.state;
    if (state && state !== "pre") continue;               // déjà commencé ou terminé
    if (new Date(e.date).getTime() <= now) continue;

    const home = c?.competitors?.find((x) => x.homeAway === "home")?.team;
    const away = c?.competitors?.find((x) => x.homeAway === "away")?.team;
    if (!home || !away) continue;

    const homeName = home.displayName ?? home.name ?? "À déterminer";
    const awayName = away.displayName ?? away.name ?? "À déterminer";
    if (comp.id === "FRIENDLY" && !isNotableNation(homeName) && !isNotableNation(awayName)) continue;

    matches.push({
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
    });
  }
  return matches;
}

export async function fetchInternationalMatches(): Promise<FetchResult> {
  const now = new Date();
  const to = addDays(now, INTERNATIONAL_WINDOW_DAYS);

  const results = await Promise.allSettled(INTERNATIONAL_COMPETITIONS.map((c) => fetchCompetition(c, now, to)));

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
