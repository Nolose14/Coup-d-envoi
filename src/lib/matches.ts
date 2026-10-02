/**
 * Point d'entrée des données. Le cache Vercel (Data Cache) garde le résultat :
 *  - clubs : 1 h        → 4 requêtes/heure max vers football-data.org, quel que soit le trafic
 *  - sélections : 6 h  → liste manuelle + TheSportsDB (gratuit, ~12 requêtes)
 * Le premier visiteur après expiration reçoit les données en cache pendant
 * que la nouvelle version se calcule en arrière-plan (stale-while-revalidate).
 */
import { unstable_cache } from "next/cache";
import { resolveBroadcasters } from "@/config/diffuseurs";
import { fetchInternationalMatches } from "@/lib/providers/manual-selections";
import { fetchClubMatches } from "@/lib/providers/football-data";
import { fetchTsdbClubMatches } from "@/lib/providers/thesportsdb-clubs";
import type { FetchResult, MatchesPayload, Section } from "@/lib/types";

const getClubsMain = unstable_cache(fetchClubMatches, ["clubs-v1"], { revalidate: 3600, tags: ["matches"] });
const getClubsTsdb = unstable_cache(fetchTsdbClubMatches, ["clubs-tsdb-v2"], { revalidate: 6 * 3600, tags: ["matches"] });

/** Clubs = LDC, Ligue 1, Premier League, Liga (football-data) + Ligue 2, Ligue 3 (TheSportsDB). */
async function getClubs(): Promise<FetchResult> {
  const [main, extra] = await Promise.allSettled([getClubsMain(), getClubsTsdb()]);
  if (main.status === "rejected" && extra.status === "rejected") throw main.reason;
  const parts = [main, extra].flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  const warnings = parts.flatMap((p) => p.warnings);
  if (main.status === "rejected") warnings.push((main.reason as Error).message);
  if (extra.status === "rejected") warnings.push(`Ligue 2 / Ligue 3 : ${(extra.reason as Error).message}`);
  return {
    updatedAt: parts.map((p) => p.updatedAt).sort()[0],
    matches: parts.flatMap((p) => p.matches),
    warnings,
  };
}
const getSelections = unstable_cache(fetchInternationalMatches, ["selections-v6"], { revalidate: 6 * 3600, tags: ["matches"] });

export async function getMatches(section: Section): Promise<MatchesPayload> {
  const result = section === "clubs" ? await getClubs() : await getSelections();
  return {
    section,
    updatedAt: result.updatedAt,
    warnings: result.warnings,
    // Les diffuseurs sont ajoutés après le cache : une modification du fichier
    // de configuration s'applique dès le redéploiement.
    matches: result.matches.map((m) => ({ ...m, broadcasters: resolveBroadcasters(m) })),
  };
}
