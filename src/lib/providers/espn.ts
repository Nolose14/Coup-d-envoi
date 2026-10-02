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

async function fetchCompetition(comp: InternationalCompetition, from: Date, to: Date): Promise<RawMatch[]> {
  const url = `${BASE}/${comp.espnSlug}/scoreboard?dates=${espnDay(from)}-${espnDay(to)}&limit=500`;
  const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ESPN : erreur ${res.status}.`);
  const data = (await res.json()) as { events?: EspnEvent[] };

  const now = Date.now();
  const matches: RawMatch[] = [];

  for (const e of data.events ?? []) {
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
