/**
 * PAGE DE TEST TEMPORAIRE : que donne vraiment Highlightly en gratuit ?
 * Ouvre https://coup-d-envoi.vercel.app/api/test-stats
 *
 * Elle cherche un match terminé récent de Ligue 1 et de Ligue des champions,
 * puis demande sa composition et ses statistiques.
 * Environ 6 à 10 requêtes par ouverture (quota gratuit : 100 par jour).
 * Le résultat est gardé 1 h : recharger la page ne consomme rien de plus.
 * La clé reste sur le serveur (variable HIGHLIGHTLY_KEY dans Vercel), elle n'est jamais affichée.
 */
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASES = ["https://soccer.highlightly.net", "https://sports.highlightly.net/football"];

type Call = { url: string; status: number; restant: string | null; json: unknown; erreur?: string };

async function call(base: string, path: string): Promise<Call> {
  const url = `${base}${path}`;
  try {
    const res = await fetch(url, {
      headers: { "x-rapidapi-key": process.env.HIGHLIGHTLY_KEY ?? "" },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = text.slice(0, 500);
    try { json = JSON.parse(text); } catch { /* réponse non JSON */ }
    return { url, status: res.status, restant: res.headers.get("x-ratelimit-requests-remaining"), json };
  } catch (e) {
    return { url, status: 0, restant: null, json: null, erreur: (e as Error).message };
  }
}

/** Aperçu court d'une réponse, pour ne pas afficher des pages entières. */
function apercu(value: unknown, max = 1200): string {
  const s = JSON.stringify(value, null, 1) ?? "";
  return s.length > max ? `${s.slice(0, max)} …(coupé)` : s;
}

function dateISO(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Les derniers jours où cette compétition a joué (jours de la semaine donnés, 0 = dimanche). */
function derniersJours(jours: number[], combien: number) {
  const out: string[] = [];
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 21 && out.length < combien; i++) {
    if (jours.includes(d.getUTCDay())) out.push(dateISO(d));
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return out;
}

interface MatchLite {
  id: number;
  homeTeam?: { name?: string };
  awayTeam?: { name?: string };
  league?: { name?: string };
  country?: { name?: string };
  state?: { description?: string; score?: { current?: string } };
}

async function tester(base: string, leagueName: string, countryCode: string | null, dates: string[]) {
  const journal: Record<string, unknown>[] = [];
  let match: MatchLite | null = null;

  for (const date of dates) {
    const q = new URLSearchParams({ date, leagueName, limit: "50" });
    if (countryCode) q.set("countryCode", countryCode);
    const r = await call(base, `/matches?${q}`);
    const data = ((r.json as { data?: MatchLite[] })?.data ?? []) as MatchLite[];
    journal.push({ etape: `Matchs du ${date}`, statut: r.status, requetesRestantes: r.restant, nombre: data.length, erreur: r.erreur ?? (r.status >= 400 ? apercu(r.json, 300) : undefined) });
    if (r.status === 401 || r.status === 403) break;
    match = data.find((m) => /finish|ended|full|terminé/i.test(m.state?.description ?? "")) ?? data[0] ?? null;
    if (match) break;
  }

  if (!match) return { trouve: false, journal };

  const lineups = await call(base, `/lineups/${match.id}`);
  const stats = await call(base, `/statistics/${match.id}`);

  return {
    trouve: true,
    match: `${match.homeTeam?.name} – ${match.awayTeam?.name} (${match.state?.score?.current ?? "?"}, ${match.state?.description ?? "?"}) — ${match.league?.name ?? ""} ${match.country?.name ?? ""}`,
    idHighlightly: match.id,
    journal,
    composition: { statut: lineups.status, requetesRestantes: lineups.restant, apercu: apercu(lineups.json) },
    statistiques: { statut: stats.status, requetesRestantes: stats.restant, apercu: apercu(stats.json) },
  };
}

const run = unstable_cache(
  async () => {
    // On essaie d'abord l'adresse « Football API », puis l'adresse « Sport API » si la première refuse.
    let base = BASES[0];
    let ligue1 = await tester(base, "Ligue 1", "FR", derniersJours([6, 0], 2));
    const refuse = !ligue1.trouve && ligue1.journal.some((j) => [401, 403, 404].includes(j.statut as number));
    if (refuse) {
      base = BASES[1];
      ligue1 = await tester(base, "Ligue 1", "FR", derniersJours([6, 0], 2));
    }
    const ldc = await tester(base, "UEFA Champions League", null, derniersJours([2, 3], 2));
    return { adresseUtilisee: base, testeLe: new Date().toISOString(), ligue1, ldc };
  },
  ["test-stats-v1"],
  { revalidate: 3600 },
);

export async function GET() {
  if (!process.env.HIGHLIGHTLY_KEY) {
    return Response.json(
      { erreur: "La variable HIGHLIGHTLY_KEY n'est pas configurée dans Vercel (ou le site n'a pas été redéployé depuis)." },
      { status: 500 },
    );
  }
  const result = await run();
  return new Response(JSON.stringify(result, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
