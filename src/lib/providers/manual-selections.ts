/**
 * Sélections = liste manuelle (src/config/matchs-selections.ts, prioritaire)
 *            + matchs récupérés automatiquement sur TheSportsDB (gratuit).
 */
import { INTERNATIONAL_COMPETITIONS } from "@/config/competitions";
import { SELECTION_MATCHES } from "@/config/matchs-selections";
import { dayKey } from "@/lib/dates";
import { flagUrl } from "@/lib/nations";
import { fetchTsdbInternational } from "@/lib/providers/thesportsdb";
import type { FetchResult, RawMatch } from "@/lib/types";

function manualMatches(now: number): RawMatch[] {
  return SELECTION_MATCHES
    .filter((m) => new Date(m.date).getTime() > now)
    .map((m) => ({
      id: `man-${m.date.slice(0, 10)}-${m.home}-${m.away}`.replace(/\s+/g, "_"),
      section: "selections" as const,
      competition: m.competition,
      competitionName: INTERNATIONAL_COMPETITIONS.find((c) => c.id === m.competition)?.name ?? "Match international",
      stageLabel: m.stage ?? null,
      stage: null,
      kickoff: new Date(m.date).toISOString(),
      timeConfirmed: true,
      home: { name: m.home, logo: flagUrl(m.home) },
      away: { name: m.away, logo: flagUrl(m.away) },
      venue: { stadium: m.stadium, city: m.city },
    }));
}

/** Même jour + mêmes équipes = même match (évite les doublons). */
const matchKey = (m: RawMatch) => `${dayKey(m.kickoff)}|${[m.home.name, m.away.name].sort().join("|")}`;

export async function fetchInternationalMatches(): Promise<FetchResult> {
  const now = Date.now();
  const manual = manualMatches(now);

  let auto: RawMatch[] = [];
  let warnings: string[] = [];
  try {
    ({ matches: auto, warnings } = await fetchTsdbInternational());
  } catch (e) {
    warnings = [`TheSportsDB : ${(e as Error).message}`];
  }

  const seen = new Set(manual.map(matchKey));
  const merged = [...manual];
  for (const m of auto) {
    const key = matchKey(m);
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(m);
    }
  }
  return { updatedAt: new Date().toISOString(), matches: merged, warnings };
}
