/** Sélections via ESPN, appelé depuis le serveur Vercel. */
import { loadInternationalMatches } from "./espn-core";

export function fetchInternationalMatches() {
  return loadInternationalMatches(async (url) => {
    const res = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
    return { status: res.status, data: res.ok ? await res.json() : null };
  });
}
