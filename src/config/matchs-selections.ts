/**
 * MATCHS DES SÉLECTIONS — liste à compléter à la main
 * ------------------------------------------------------------
 * Aucune API gratuite ne fournit la saison internationale en cours :
 * les matchs se saisissent ici. Les matchs passés disparaissent tout seuls.
 *
 * Heure : heure de Paris, suivie du décalage
 *   +02:00 de fin mars à fin octobre (heure d'été)
 *   +01:00 de fin octobre à fin mars (heure d'hiver)
 * Compétition : "NL" (Ligue des nations), "FRIENDLY" (amical),
 *               "WCQ" (qualif. Mondial), "ECQ" (qualif. Euro)
 * Nations : nom en français (voir src/lib/nations.ts pour les drapeaux)
 *
 * Calendrier des Bleus vérifié le 2 octobre 2026 (FFF / UEFA).
 */
import type { CompetitionId } from "@/lib/types";

export interface ManualMatch {
  date: string;
  home: string;
  away: string;
  competition: CompetitionId;
  stadium: string;
  city: string;
  stage?: string;
}

export const SELECTION_MATCHES: ManualMatch[] = [
  { date: "2026-10-02T20:45:00+02:00", home: "France", away: "Italie",   competition: "NL", stadium: "Stade de France",          city: "Saint-Denis", stage: "Phase de ligue" },
  { date: "2026-10-05T20:45:00+02:00", home: "France", away: "Belgique", competition: "NL", stadium: "Stade de France",          city: "Saint-Denis", stage: "Phase de ligue" },
  { date: "2026-11-12T20:45:00+01:00", home: "Italie", away: "France",   competition: "NL", stadium: "Stade Giuseppe-Meazza",    city: "Milan",       stage: "Phase de ligue" },
  { date: "2026-11-15T20:45:00+01:00", home: "France", away: "Turquie",  competition: "NL", stadium: "Stade Atlantique",         city: "Bordeaux",    stage: "Phase de ligue" },
];
