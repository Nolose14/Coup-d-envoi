/** Sélections : lues depuis src/config/matchs-selections.ts (aucune API). */
import { INTERNATIONAL_COMPETITIONS } from "@/config/competitions";
import { SELECTION_MATCHES } from "@/config/matchs-selections";
import { flagUrl } from "@/lib/nations";
import type { FetchResult, RawMatch } from "@/lib/types";

export async function fetchInternationalMatches(): Promise<FetchResult> {
  const now = Date.now();
  const matches: RawMatch[] = SELECTION_MATCHES
    .filter((m) => new Date(m.date).getTime() > now)
    .map((m) => ({
      id: `man-${m.date.slice(0, 10)}-${m.home}-${m.away}`.replace(/\s+/g, "_"),
      section: "selections",
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
  return { updatedAt: new Date().toISOString(), matches, warnings: [] };
}
