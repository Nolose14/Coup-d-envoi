/**
 * PAGE DE TEST TEMPORAIRE (version 2) : que donne vraiment Highlightly en gratuit ?
 * Ouvre https://coup-d-envoi.vercel.app/api/test-stats
 *
 * La version 1 a montré que la clé fonctionne, mais que la recherche par nom
 * de championnat ne renvoyait aucun match. Cette version :
 *  1. liste TOUS les matchs d'un samedi récent, pour voir les noms exacts des championnats ;
 *  2. cherche les identifiants de la Ligue 1 et de la Ligue des champions ;
 *  3. demande la composition et les statistiques d'un match terminé de chacune.
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

const dateISO = (d: Date) => d.toISOString().slice(0, 10);

/** Dernier jour passé correspondant à l'un des jours donnés (0 = dimanche, 6 = samedi). */
function dernierJour(jours: number[]) {
  const d = new Date();
  for (let i = 1; i < 15; i++) {
    d.setUTCDate(d.getUTCDate() - 1);
    if (jours.includes(d.getUTCDay())) return dateISO(d);
  }
  return dateISO(d);
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

async function matchsDeLigue(leagueId: string, dates: string[]) {
  const journal: Obj[] = [];
  for (const date of dates) {
    const r = await call(`/matches?${new URLSearchParams({ leagueId, date, limit: "50" })}`);
    const data = liste(r.json);
    journal.push({ date, statut: r.status, requetesRestantes: r.restant, nombre: data.length, plan: (r.json as Obj)?.plan });
    const m = data.find(termine) ?? data[0];
    if (m) return { journal, match: m };
  }
  return { journal, match: null as Obj | null };
}

const run = unstable_cache(
  async () => {
    const samedi = dernierJour([6]);
    const dimanche = dernierJour([0]);
    const mercredi = dernierJour([3]);
    const mardi = dernierJour([2]);

    // 1. Tous les matchs d'un samedi : quels championnats Highlightly renvoie-t-il en gratuit ?
    const tous = await call(`/matches?${new URLSearchParams({ date: samedi, limit: "100" })}`);
    const data = liste(tous.json);
    const ligues = [...new Set(data.map((m) => `${nomLigue(m)} (${pays(m)})`))];
    const exemple = data[0];

    // 2. Identifiants des championnats
    const l1 = await chercherLigue("Ligue 1", /france|\bFR\b/i);
    const cl = await chercherLigue("Champions League", /uefa|europe|world/i);

    // 3. Un match terminé de chacun, avec composition et statistiques
    const l1Match = l1.choisie ? await matchsDeLigue(l1.choisie.id, [samedi, dimanche]) : null;
    const clMatch = cl.choisie ? await matchsDeLigue(cl.choisie.id, [mercredi, mardi]) : null;

    return {
      testeLe: new Date().toISOString(),
      etape1_tousLesMatchsDuSamedi: {
        date: samedi,
        statut: tous.status,
        requetesRestantes: tous.restant,
        nombreRecu: data.length,
        totalAnnonce: ((tous.json as Obj)?.pagination as Obj)?.totalCount,
        messageOffreGratuite: (tous.json as Obj)?.plan,
        championnatsPresents: ligues.slice(0, 60),
        exempleDeMatch: exemple ? apercu(exemple, 1200) : apercu(tous.json, 600),
      },
      etape2_ligue1: l1,
      etape2_ldc: cl,
      etape3_ligue1: l1Match && { journal: l1Match.journal, ...(l1Match.match ? await detailsMatch(l1Match.match) : { trouve: false }) },
      etape3_ldc: clMatch && { journal: clMatch.journal, ...(clMatch.match ? await detailsMatch(clMatch.match) : { trouve: false }) },
    };
  },
  ["test-stats-v2"],
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
