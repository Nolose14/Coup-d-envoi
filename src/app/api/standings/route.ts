import { NextResponse } from "next/server";
import { getStandings } from "@/lib/standings";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // les appels sont espacés pour respecter la limite gratuite

export async function GET() {
  try {
    const payload = await getStandings();
    return NextResponse.json(payload, {
      headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
