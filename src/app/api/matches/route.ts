import { NextResponse, type NextRequest } from "next/server";
import { getMatches } from "@/lib/matches";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section") === "selections" ? "selections" : "clubs";
  try {
    const payload = await getMatches(section);
    return NextResponse.json(payload, {
      // Cache CDN de 5 min en plus : les ouvertures rapprochées de l'app ne coûtent rien.
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue.";
    return NextResponse.json({ error: message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
