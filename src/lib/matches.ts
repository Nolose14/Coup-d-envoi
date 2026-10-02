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
import type { MatchesPayload, Section } from "@/lib/types";

const getClubs = unstable_cache(fetchClubMatches, ["clubs-v1"], { revalidate: 3600, tags: ["matches"] });
const getSelections = unstable_cache(fetchInternationalMatches, ["selections-v5"], { revalidate: 6 * 3600, tags: ["matches"] });

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
