/**
 * PAGE DE TEST TEMPORAIRE (version 4) : que donne vraiment Highlightly en gratuit ?
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

const resume = (m: Obj) =>
  `${str(m.date).slice(0, 16).replace("T", " ")} UTC · ${str((m.homeTeam as Obj)?.name)} – ${str((m.awayTeam as Obj)?.name)} · ${etat(m)} ${str(((m.state as Obj)?.score as Obj)?.current)}`.trim();

/** Une page de matchs d'un championnat, résumée. */
async function page(params: Record<string, string>) {
  const r = await call(`/matches?${new URLSearchParams({ limit: "100", ...params })}`);
  const data = liste(r.json);
  const tries = [...data].sort((x, y) => str(x.date).localeCompare(str(y.date)));
  return {
    statut: r.status,
    requetesRestantes: r.restant,
    nombreRecu: data.length,
    totalAnnonce: ((r.json as Obj)?.pagination as Obj)?.totalCount,
    termines: tries.filter(termine),
    premiers: tries.slice(0, 6).map(resume),
  };
}

async function fiche(m: Obj) {
  const d = await detailsMatch(m);
  const f = await call(`/matches/${str(m.id)}`);
  return { ...d, ficheComplete: { statut: f.status, requetesRestantes: f.restant, apercu: apercu(f.json, 3000) } };
}

const run = unstable_cache(
  async () => {
    const L1 = "52695";
    // 1. Les 62 matchs de Ligue 1 2026 que la v3 n'avait pas reçus (au-delà des 100 premiers)
    const suite = await page({ leagueId: L1, season: "2026", offset: "100" });
    // 2. Dernière journée avant la trêve internationale
    const sept: Awaited<ReturnType<typeof page>>[] = [];
    for (const date of ["2026-09-20", "2026-09-19", "2026-09-21"]) {
      const p = await page({ leagueId: L1, date });
      sept.push(p);
      if (p.termines.length) break;
    }
    const recent = [...suite.termines, ...sept.flatMap((p) => p.termines)].sort((x, y) => str(y.date).localeCompare(str(x.date)))[0];

    // 3. Valeur sûre : un match terminé de la saison passée, pour voir le format des compositions et stats
    const passee = await page({ leagueId: L1, season: "2025" });
    const ancien = passee.termines[passee.termines.length - 1];

    return {
      testeLe: new Date().toISOString(),
      ligue1_2026_suite: { ...suite, termines: suite.termines.length, derniersTermines: suite.termines.slice(-6).map(resume) },
      ligue1_septembre: sept.map((p) => ({ ...p, termines: p.termines.length })),
      ligue1_matchRecent: recent ? await fiche(recent) : "aucun match terminé trouvé pour la saison 2026",
      ligue1_2025: { ...passee, termines: passee.termines.length },
      ligue1_matchSaisonPassee: ancien ? await fiche(ancien) : null,
    };
  },
  ["test-stats-v4"],
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
