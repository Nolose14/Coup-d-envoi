import { CLUB_COMPETITIONS, TSDB_CLUB_COMPETITIONS } from "@/config/competitions";

/** Filtres de l'onglet Clubs, dans l'ordre d'affichage. */
export const CLUB_FILTERS = [
  { id: "all", label: "Tout" },
  ...[...CLUB_COMPETITIONS.slice(0, 2), ...TSDB_CLUB_COMPETITIONS, ...CLUB_COMPETITIONS.slice(2)].map((c) => ({
    id: c.id as string,
    label: c.short,
  })),
];

/** Filtres de l'onglet Sélections. */
export const SELECTION_FILTERS = [
  { id: "all", label: "Tout" },
  { id: "france", label: "Équipe de France" },
  { id: "NL", label: "Ligue des nations" },
  { id: "FRIENDLY", label: "Amicaux" },
];
