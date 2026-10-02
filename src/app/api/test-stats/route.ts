/**
 * PAGE DE TEST TEMPORAIRE (version 3) : que donne vraiment Highlightly en gratuit ?
 * Ouvre https://coup-d-envoi.vercel.app/api/test-stats
 *
 * La v2 a montré que l'offre gratuite donne tout (« All data available »), que la
 * Ligue 1 a l'identifiant 52695, mais que le week-end testé était une trêve
 * internationale. Cette version prend toute la saison et le dernier match terminé.
 * Environ 10 requêtes par ouverture (quota gratuit : 100 par jour).
 * Le résultat est gardé 1 h : recharger la page ne consomme rien de plus.
 * La clé reste sur le serveur (variable HIGHLIGHTLY_KEY dans Vercel), elle n'est jamais affichée.
 */
import { unstable_cache } from "next/cache";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE = "https://soccer.highlightly.net";

type Call = { status: number; restant: string | null; json: unknown; erreur?: string };

async function call(path: string): Promise<Call> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { "x-rapidapi-key": process.env.HIGHLIGHTLY_KEY ?? "" },
      cache: "no-store",
    });
    const text = await res.text();
    let json: unknown = text.slice(0, 500);
    try { json = JSON.parse(text); } catch { /* réponse non JSON */ }
    return { status: res.status, restant: res.headers.get("x-ratelimit-requests-remaining"), json };
  } catch (e) {
    return { status: 0, restant: null, json: null, erreur: (e as Error).message };
  }
}

function apercu(value: unknown, max = 1500): string {
  const s = JSON.stringify(value) ?? "";
  return s.length > max ? `${s.slice(0, max)} …(coupé)` : s;
}

interface Obj { [k: string]: unknown }
const liste = (j: unknown): Obj[] => (Array.isArray(j) ? j : Array.isArray((j as Obj)?.data) ? ((j as Obj).data as Obj[]) : []) as Obj[];
const str = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
const nomLigue = (m: Obj) => str((m.league as Obj)?.name);
const pays = (m: Obj) => `${str((m.country as Obj)?.name)} ${str((m.country as Obj)?.code)}`.trim();
const etat = (m: Obj) => str((m.state as Obj)?.description);
const termine = (m: Obj) => /finish|ended|full|after|terminé/i.test(etat(m));

async function detailsMatch(m: Obj) {
  const lineups = await call(`/lineups/${str(m.id)}`);
  const stats = await call(`/statistics/${str(m.id)}`);
  return {
    match: `${str((m.homeTeam as Obj)?.name)} – ${str((m.awayTeam as Obj)?.name)} (${str(((m.state as Obj)?.score as Obj)?.current) || "?"}, ${etat(m) || "?"})`,
    idHighlightly: str(m.id),
    composition: { statut: lineups.status, requetesRestantes: lineups.restant, apercu: apercu(lineups.json) },
    statistiques: { statut: stats.status, requetesRestantes: stats.restant, apercu: apercu(stats.json) },
  };
}

async function chercherLigue(nom: string, paysVoulu: RegExp) {
  const r = await call(`/leagues?${new URLSearchParams({ leagueName: nom, limit: "20" })}`);
  const ligues = liste(r.json).map((l) => ({ id: str(l.id), nom: str(l.name), pays: pays(l) }));
  const choisie = ligues.find((l) => paysVoulu.test(`${l.nom} ${l.pays}`)) ?? ligues[0] ?? null;
  return { statut: r.status, requetesRestantes: r.restant, ligues: ligues.slice(0, 10), choisie, brut: ligues.length ? undefined : apercu(r.json, 600) };
}

/** Tous les matchs d'un championnat sur la saison, puis le plus récent qui est terminé. */
async function dernierMatchTermine(leagueId: string) {
  const r = await call(`/matches?${new URLSearchParams({ leagueId, season: "2026", limit: "100" })}`);
  const data = liste(r.json);
  const finis = data.filter(termine).sort((x, y) => str(y.date).localeCompare(str(x.date)));
  return {
    statut: r.status,
    requetesRestantes: r.restant,
    nombreRecu: data.length,
    totalAnnonce: ((r.json as Obj)?.pagination as Obj)?.totalCount,
    nombreTermines: finis.length,
    datesDesMatchs: [...new Set(data.map((m) => str(m.date).slice(0, 10)))].sort().slice(0, 40),
    match: finis[0] ?? null,
    brut: data.length ? undefined : apercu(r.json, 600),
  };
}

const run = unstable_cache(
  async () => {
    // 1. Identifiant de la Ligue des champions (la v2 a montré que le nom doit être exact)
    let cl = await chercherLigue("UEFA Champions League", /world|europe/i);
    if (!cl.choisie) cl = await chercherLigue("Champions League", /world|europe/i);

    // 2. Ligue 1 (identifiant 52695 trouvé par la v2) et LDC : toute la saison, puis le dernier match terminé
    const l1 = await dernierMatchTermine("52695");
    const ldc = cl.choisie ? await dernierMatchTermine(cl.choisie.id) : null;

    // 3. Composition, statistiques et fiche complète du dernier match terminé
    const l1Details = l1.match ? await detailsMatch(l1.match) : null;
    const l1Fiche = l1.match ? await call(`/matches/${str(l1.match.id)}`) : null;
    const ldcDetails = ldc?.match ? await detailsMatch(ldc.match) : null;

    const sansMatch = <T extends { match: unknown }>(o: T) => ({ ...o, match: undefined });
    return {
      testeLe: new Date().toISOString(),
      ligue1_saison: sansMatch(l1),
      ligue1_dernierMatch: l1Details,
      ligue1_ficheComplete: l1Fiche && { statut: l1Fiche.status, requetesRestantes: l1Fiche.restant, apercu: apercu(l1Fiche.json, 3000) },
      ldc_recherche: cl,
      ldc_saison: ldc && sansMatch(ldc),
      ldc_dernierMatch: ldcDetails,
    };
  },
  ["test-stats-v3"],
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
