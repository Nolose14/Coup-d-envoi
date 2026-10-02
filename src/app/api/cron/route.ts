/**
 * Appelée chaque jour vers 6 h (heure de Paris) par Vercel Cron (vercel.json).
 * Force la mise à jour des données même si personne n'a ouvert l'app,
 * pour que les changements d'horaire ou de stade soient pris en compte.
 */
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getMatches } from "@/lib/matches";
import { getStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // le scan des sélections est volontairement ralenti

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  revalidateTag("matches");
  revalidateTag("standings");
  const [clubs, selections, standings] = await Promise.allSettled([
    getMatches("clubs"),
    getMatches("selections"),
    getStandings(),
  ]);

  return NextResponse.json({
    ok: true,
    clubs: clubs.status === "fulfilled" ? clubs.value.matches.length : String(clubs.reason),
    selections: selections.status === "fulfilled" ? selections.value.matches.length : String(selections.reason),
    standings: standings.status === "fulfilled" ? standings.value.tables.length : String(standings.reason),
  });
}
