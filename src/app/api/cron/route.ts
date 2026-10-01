/**
 * Appelée chaque jour vers 6 h (heure de Paris) par Vercel Cron (vercel.json).
 * Force la mise à jour des données même si personne n'a ouvert l'app,
 * pour que les changements d'horaire ou de stade soient pris en compte.
 */
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getMatches } from "@/lib/matches";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  revalidateTag("matches");
  const [clubs, selections] = await Promise.allSettled([getMatches("clubs"), getMatches("selections")]);

  return NextResponse.json({
    ok: true,
    clubs: clubs.status === "fulfilled" ? clubs.value.matches.length : String(clubs.reason),
    selections: selections.status === "fulfilled" ? selections.value.matches.length : String(selections.reason),
  });
}
