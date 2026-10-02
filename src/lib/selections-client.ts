/**
 * Plan B : si ESPN refuse les requêtes du serveur Vercel, l'iPhone
 * interroge ESPN lui-même (ESPN accepte les vrais navigateurs).
 */
import { resolveBroadcasters } from "@/config/diffuseurs";
import { loadInternationalMatches } from "@/lib/providers/espn-core";
import type { MatchesPayload } from "@/lib/types";

export async function fetchSelectionsFromDevice(): Promise<MatchesPayload> {
  const result = await loadInternationalMatches(async (url) => {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    return { status: res.status, data: res.ok ? await res.json() : null };
  });
  return {
    section: "selections",
    updatedAt: result.updatedAt,
    warnings: result.warnings,
    matches: result.matches.map((m) => ({ ...m, broadcasters: resolveBroadcasters(m) })),
  };
}
